import io
import json
import logging
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
from fastapi import UploadFile, HTTPException

from app.services.catalog_service import catalog_service
from app.services.geocoding_service import geocoding_service, HUB_CRATEUS, PONTO_TOPICS
from app.services.fleet_service import fleet_service, OFFICIAL_FLEET
from app.services.routing_solver import (
    routing_solver,
    DeliveryOrder,
    VehicleRouteResult,
)
from app.services.gemini_service import gemini_service
from app.db.sqlite import save_report, get_report_by_id
from app.schemas.routing import (
    PreviewResponse,
    PreviewOrderDTO,
    OptimizeResponse,
    StrategySummaryCardDTO,
    VehicleRouteDTO,
    RouteStopDTO,
    VehicleFuelDTO,
    RouteOptionDTO,
    DispatchSummaryResponse,
    LoadingOrderItemDTO,
    VehicleSummaryDTO,
    DefinedRouteStrategyDTO,
)

logger = logging.getLogger(__name__)


def parse_monetary_value(val: Any) -> float:
    if pd.isna(val):
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).replace("R$", "").strip()
    val_str = val_str.replace(".", "").replace(",", ".")
    try:
        return float(val_str)
    except ValueError:
        return 0.0


class RoutingService:
    def read_csv_to_dataframe(self, content_bytes: bytes) -> pd.DataFrame:
        """Lê o arquivo CSV lidando com diferentes encodings e delimitadores."""
        decoded_text = ""
        for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
            try:
                decoded_text = content_bytes.decode(enc)
                break
            except UnicodeDecodeError:
                continue

        if not decoded_text:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar o arquivo CSV. Use UTF-8 ou Latin-1.")

        first_line = decoded_text.splitlines()[0] if decoded_text.splitlines() else ""
        delimiter = ";" if first_line.count(";") > first_line.count(",") else ","

        try:
            df = pd.read_csv(io.StringIO(decoded_text), sep=delimiter)
            return df
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erro ao processar CSV: {str(e)}")

    def _extract_columns(self, df: pd.DataFrame) -> Dict[str, Optional[str]]:
        def find_col(candidates):
            for cand in candidates:
                for col in df.columns:
                    if cand == col.strip().upper():
                        return col
            for cand in candidates:
                for col in df.columns:
                    if cand in col.strip().upper():
                        return col
            return None

        return {
            "order_id": find_col(["PEDIDO", "ID_PEDIDO", "NUMERO_PEDIDO", "ID"]),
            "city": find_col(["CIDADE", "MUNICIPIO", "DESTINO"]),
            "address": find_col(["ENDERECO", "ENDEREÇO", "LOGRADOURO", "RUA", "BAIRRO", "PONTO_REFERENCIA", "LOCAL_ENTREGA", "DESTINO_ENDERECO", "OBSERVAÇÃO", "OBSERVACAO", "OBS"]),
            "delivery_type": find_col(["SITUACAO_CSV_ENTREGA", "SITUACAO", "TIPO_ENTREGA", "LOGISTICA"]),
            "value": find_col(["VALOR DO PEDIDO", "VALOR_PEDIDO", "VALOR"]),
            "qty": find_col(["QTD_ITENS", "QTD", "QUANTIDADE"]),
            "items": find_col(["ITENS_RESUMO", "RESUMO_ITENS", "ITENS", "PRODUTOS"]),
            "date": find_col(["DATA", "DATA_PEDIDO"]),
        }

    def generate_preview(self, filename: str, content_bytes: bytes) -> PreviewResponse:
        df = self.read_csv_to_dataframe(content_bytes)
        cols = self._extract_columns(df)

        total_orders = len(df)
        pickup_orders = []
        delivery_orders = []
        delivery_types_count: Dict[str, int] = {}
        cities_set = set()
        estimated_weight = 0.0

        for idx, row in df.iterrows():
            order_id = str(row[cols["order_id"]]).strip() if cols["order_id"] else f"PED-{idx+1}"
            raw_city = str(row[cols["city"]]).strip() if cols["city"] and not pd.isna(row[cols["city"]]) else "CRATEUS"
            raw_address = str(row[cols["address"]]).strip() if cols.get("address") and not pd.isna(row[cols["address"]]) else ""
            raw_type = str(row[cols["delivery_type"]]).strip().upper() if cols["delivery_type"] and not pd.isna(row[cols["delivery_type"]]) else "NORMAL"
            val = parse_monetary_value(row[cols["value"]]) if cols["value"] else 0.0
            qty = int(row[cols["qty"]]) if cols["qty"] and not pd.isna(row[cols["qty"]]) and str(row[cols["qty"]]).isdigit() else 1
            items_str = str(row[cols["items"]]) if cols["items"] and not pd.isna(row[cols["items"]]) else ""

            # Standardize delivery type
            dtype = "NORMAL"
            if "RETIRADA" in raw_type:
                dtype = "RETIRADA"
            elif "URGENTE" in raw_type:
                dtype = "URGENTE"
            elif "TOPIC" in raw_type or "TOPIQUE" in raw_type:
                dtype = "TOPIC"
            elif "PROGRAMADO" in raw_type:
                dtype = "PROGRAMADO"

            loc_res = geocoding_service.resolve_location(
                city_raw=raw_city,
                address_raw=raw_address,
                delivery_type=dtype,
                order_index=idx,
            )

            delivery_types_count[dtype] = delivery_types_count.get(dtype, 0) + 1
            cities_set.add(loc_res.base_city)

            weight, volume = catalog_service.estimate_order_metrics(items_str, qtd_itens=qty)
            estimated_weight += weight

            item_dto = PreviewOrderDTO(
                order_id=order_id,
                city=loc_res.base_city,
                address=loc_res.address if loc_res.address else None,
                is_intra_city=loc_res.is_intra_city,
                route_type=loc_res.route_type,
                delivery_type=dtype,
                value_reais=round(val, 2),
                weight_kg=weight,
                volume_m3=volume,
                items_summary=items_str[:120] + ("..." if len(items_str) > 120 else ""),
            )

            if dtype == "RETIRADA":
                pickup_orders.append(item_dto.model_dump())
            else:
                delivery_orders.append(item_dto)

        is_mountain = geocoding_service.is_mountain_region(list(cities_set))

        return PreviewResponse(
            filename=filename,
            total_orders=total_orders,
            orders_for_delivery=len(delivery_orders),
            pickup_orders_count=len(pickup_orders),
            delivery_types_count=delivery_types_count,
            cities_found=sorted(list(cities_set)),
            estimated_total_weight_kg=round(estimated_weight, 2),
            is_mountain_route=is_mountain,
            pickup_orders=pickup_orders[:50],
            sample_orders=delivery_orders[:20],
        )

    def optimize_routes(
        self, filename: str, content_bytes: bytes, user_prompt: Optional[str] = None
    ) -> OptimizeResponse:
        df = self.read_csv_to_dataframe(content_bytes)
        cols = self._extract_columns(df)

        orders_to_route: List[DeliveryOrder] = []
        pickup_orders: List[Dict[str, Any]] = []
        cities_in_batch = set()

        # 1. Parse rows and filter RETIRADA
        for idx, row in df.iterrows():
            order_id = str(row[cols["order_id"]]).strip() if cols["order_id"] else f"PED-{idx+1}"
            raw_city = str(row[cols["city"]]).strip() if cols["city"] and not pd.isna(row[cols["city"]]) else "CRATEUS"
            raw_address = str(row[cols["address"]]).strip() if cols.get("address") and not pd.isna(row[cols["address"]]) else ""
            raw_type = str(row[cols["delivery_type"]]).strip().upper() if cols["delivery_type"] and not pd.isna(row[cols["delivery_type"]]) else "NORMAL"
            val = parse_monetary_value(row[cols["value"]]) if cols["value"] else 0.0
            qty = int(row[cols["qty"]]) if cols["qty"] and not pd.isna(row[cols["qty"]]) and str(row[cols["qty"]]).isdigit() else 1
            items_str = str(row[cols["items"]]) if cols["items"] and not pd.isna(row[cols["items"]]) else ""
            date_str = str(row[cols["date"]]).strip() if cols["date"] and not pd.isna(row[cols["date"]]) else ""

            dtype = "NORMAL"
            if "RETIRADA" in raw_type:
                dtype = "RETIRADA"
            elif "URGENTE" in raw_type:
                dtype = "URGENTE"
            elif "TOPIC" in raw_type or "TOPIQUE" in raw_type:
                dtype = "TOPIC"
            elif "PROGRAMADO" in raw_type:
                dtype = "PROGRAMADO"

            loc_res = geocoding_service.resolve_location(
                city_raw=raw_city,
                address_raw=raw_address,
                delivery_type=dtype,
                order_index=idx,
            )

            cities_in_batch.add(loc_res.base_city)
            weight, volume = catalog_service.estimate_order_metrics(items_str, qtd_itens=qty)

            if dtype == "RETIRADA":
                pickup_orders.append({
                    "order_id": order_id,
                    "city": loc_res.base_city,
                    "address": loc_res.address,
                    "delivery_type": dtype,
                    "weight_kg": weight,
                    "volume_m3": volume,
                    "value_reais": round(val, 2),
                    "items_summary": items_str,
                })
                continue

            orders_to_route.append(
                DeliveryOrder(
                    order_id=order_id,
                    city=loc_res.base_city,
                    delivery_type=dtype,
                    weight_kg=weight,
                    volume_m3=volume,
                    value_reais=val,
                    items_summary=items_str,
                    lat=loc_res.lat,
                    lon=loc_res.lon,
                    date_str=date_str,
                    address=loc_res.address,
                    is_intra_city=loc_res.is_intra_city,
                    route_type=loc_res.route_type,
                )
            )

        is_mountain = geocoding_service.is_mountain_region(list(cities_in_batch))

        # 2. Extract constraints and vehicle allocations via Gemini Service / NLP
        llm_config = gemini_service.parse_dispatch_prompt(
            user_prompt=user_prompt or "",
            cities_in_batch=list(cities_in_batch),
        )

        # 3. Active fleet selection
        if is_mountain:
            # Moto cannot go to mountain
            active_vehicles = [v for v in OFFICIAL_FLEET if v.operates_in_mountain]
        else:
            active_vehicles = list(OFFICIAL_FLEET)

        # 4. Build rich nodes list & distance matrix
        # Node 0 is Depot (Crateús CD)
        depot_node = {
            "lat": HUB_CRATEUS["lat"],
            "lon": HUB_CRATEUS["lon"],
            "base_city": "CRATEUS",
            "is_intra_city": False,
            "address": "Centro de Distribuição (Crateús)",
        }
        all_nodes = [depot_node]
        for o in orders_to_route:
            all_nodes.append({
                "lat": o.lat,
                "lon": o.lon,
                "base_city": o.city,
                "is_intra_city": o.is_intra_city,
                "address": o.address,
            })

        distance_matrix, duration_matrix = geocoding_service.build_distance_matrix(all_nodes)

    def _format_route_dto(
        self,
        route_results: List[VehicleRouteResult],
    ) -> Tuple[List[VehicleRouteDTO], str, float, float]:
        full_manifest_parts = []
        routes_dto_list: List[VehicleRouteDTO] = []
        total_fuel_l = 0.0
        total_fuel_cost = 0.0

        for r in route_results:
            stops_summary = [
                {
                    "stop": s.stop_number,
                    "order": s.order.order_id,
                    "city": s.order.city,
                    "address": s.order.address or "Polo da Cidade",
                    "route_type": s.order.route_type,
                    "type": s.order.delivery_type,
                    "weight_kg": s.order.weight_kg,
                    "loading_position": s.loading_order_label,
                }
                for s in r.stops
            ]

            manifest_md = gemini_service.generate_operational_manifest(
                vehicle_name=r.vehicle.name,
                emoji=r.vehicle.emoji,
                color=r.vehicle.color,
                total_distance_km=r.total_distance_km,
                total_weight_kg=r.total_weight_kg,
                effective_capacity_kg=r.effective_capacity_kg,
                safety_factor=r.safety_factor_label,
                stops_summary=stops_summary,
                has_topics=r.has_topics,
                has_urgent=r.has_urgent,
            )
            r.manifest_markdown = manifest_md
            full_manifest_parts.append(manifest_md)

            fuel_dto = VehicleFuelDTO(**r.fuel_info) if r.fuel_info else None
            if fuel_dto:
                total_fuel_l += fuel_dto.estimated_consumption_liters
                total_fuel_cost += fuel_dto.estimated_cost_reais

            routes_dto_list.append(
                VehicleRouteDTO(
                    vehicle_id=r.vehicle.id,
                    vehicle_name=r.vehicle.name,
                    color=r.vehicle.color,
                    hex_color=r.vehicle.hex_color,
                    emoji=r.vehicle.emoji,
                    total_distance_km=round(r.total_distance_km, 2),
                    total_weight_kg=round(r.total_weight_kg, 2),
                    total_volume_m3=round(r.total_volume_m3, 3),
                    effective_capacity_kg=r.effective_capacity_kg,
                    effective_capacity_m3=r.effective_capacity_m3,
                    safety_factor_label=r.safety_factor_label,
                    occupancy_rate_percent=round(r.occupancy_rate_percent, 1),
                    meets_minimum_load=r.meets_minimum_load,
                    has_topics=r.has_topics,
                    has_urgent=r.has_urgent,
                    stops_count=len(r.stops),
                    intra_city_stops_count=r.intra_city_stops_count,
                    inter_city_stops_count=r.inter_city_stops_count,
                    fuel_info=fuel_dto,
                    stops=[
                        RouteStopDTO(
                            stop_number=s.stop_number,
                            order_id=s.order.order_id,
                            city=s.order.city,
                            delivery_type=s.order.delivery_type,
                            weight_kg=s.order.weight_kg,
                            volume_m3=s.order.volume_m3,
                            value_reais=s.order.value_reais,
                            items_summary=s.order.items_summary,
                            lat=s.order.lat,
                            lon=s.order.lon,
                            distance_from_prev_km=round(s.distance_from_prev_km, 2),
                            cumulative_distance_km=round(s.cumulative_distance_km, 2),
                            loading_order_position=s.loading_order_position,
                            loading_order_label=s.loading_order_label,
                            address=s.order.address if s.order.address else None,
                            is_intra_city=s.order.is_intra_city,
                            route_type=s.order.route_type,
                        )
                        for s in r.stops
                    ],
                    geojson=r.geojson_feature,
                    manifest_markdown=manifest_md,
                )
            )

        combined_manifest = "\n\n---\n\n".join(full_manifest_parts)
        return routes_dto_list, combined_manifest, round(total_fuel_l, 2), round(total_fuel_cost, 2)

    def optimize_routes(
        self,
        filename: str,
        content_bytes: bytes,
        user_prompt: Optional[str] = None,
    ) -> OptimizeResponse:
        df = self.read_csv_to_dataframe(content_bytes)
        cols = self._extract_columns(df)

        orders_to_route: List[DeliveryOrder] = []
        pickup_orders: List[Dict[str, Any]] = []
        cities_in_batch = set()

        # 1. Parse rows and filter RETIRADA
        for idx, row in df.iterrows():
            order_id = str(row[cols["order_id"]]).strip() if cols["order_id"] else f"PED-{idx+1}"
            raw_city = str(row[cols["city"]]).strip() if cols["city"] and not pd.isna(row[cols["city"]]) else "CRATEUS"
            raw_address = str(row[cols["address"]]).strip() if cols.get("address") and not pd.isna(row[cols["address"]]) else ""
            raw_type = str(row[cols["delivery_type"]]).strip().upper() if cols["delivery_type"] and not pd.isna(row[cols["delivery_type"]]) else "NORMAL"
            val = parse_monetary_value(row[cols["value"]]) if cols["value"] else 0.0
            qty = int(row[cols["qty"]]) if cols["qty"] and not pd.isna(row[cols["qty"]]) and str(row[cols["qty"]]).isdigit() else 1
            items_str = str(row[cols["items"]]) if cols["items"] and not pd.isna(row[cols["items"]]) else ""
            date_str = str(row[cols["date"]]).strip() if cols["date"] and not pd.isna(row[cols["date"]]) else ""

            dtype = "NORMAL"
            if "RETIRADA" in raw_type:
                dtype = "RETIRADA"
            elif "URGENTE" in raw_type:
                dtype = "URGENTE"
            elif "TOPIC" in raw_type or "TOPIQUE" in raw_type:
                dtype = "TOPIC"
            elif "PROGRAMADO" in raw_type:
                dtype = "PROGRAMADO"

            loc_res = geocoding_service.resolve_location(
                city_raw=raw_city,
                address_raw=raw_address,
                delivery_type=dtype,
                order_index=idx,
            )

            cities_in_batch.add(loc_res.base_city)
            weight, volume = catalog_service.estimate_order_metrics(items_str, qtd_itens=qty)

            if dtype == "RETIRADA":
                pickup_orders.append({
                    "order_id": order_id,
                    "city": loc_res.base_city,
                    "address": loc_res.address,
                    "delivery_type": dtype,
                    "weight_kg": weight,
                    "volume_m3": volume,
                    "value_reais": round(val, 2),
                    "items_summary": items_str,
                })
                continue

            orders_to_route.append(
                DeliveryOrder(
                    order_id=order_id,
                    city=loc_res.base_city,
                    delivery_type=dtype,
                    weight_kg=weight,
                    volume_m3=volume,
                    value_reais=val,
                    items_summary=items_str,
                    lat=loc_res.lat,
                    lon=loc_res.lon,
                    date_str=date_str,
                    address=loc_res.address,
                    is_intra_city=loc_res.is_intra_city,
                    route_type=loc_res.route_type,
                )
            )

        is_mountain = geocoding_service.is_mountain_region(list(cities_in_batch))

        # 2. Extract constraints and vehicle allocations via Gemini Service / NLP
        llm_config = gemini_service.parse_dispatch_prompt(
            user_prompt=user_prompt or "",
            cities_in_batch=list(cities_in_batch),
        )

        # 3. Active fleet selection
        if is_mountain:
            active_vehicles = [v for v in OFFICIAL_FLEET if v.operates_in_mountain]
        else:
            active_vehicles = list(OFFICIAL_FLEET)

        # 4. Build rich nodes list & distance matrix
        depot_node = {
            "lat": HUB_CRATEUS["lat"],
            "lon": HUB_CRATEUS["lon"],
            "base_city": "CRATEUS",
            "is_intra_city": False,
            "address": "Centro de Distribuição (Crateús)",
        }
        all_nodes = [depot_node]
        for o in orders_to_route:
            all_nodes.append({
                "lat": o.lat,
                "lon": o.lon,
                "base_city": o.city,
                "is_intra_city": o.is_intra_city,
                "address": o.address,
            })

        distance_matrix, duration_matrix = geocoding_service.build_distance_matrix(all_nodes)

        # 5. Executar solucionador para as 5 estratégias em lote (uma única vez)
        all_strategy_results = routing_solver.solve_all_strategies(
            orders=orders_to_route,
            active_vehicles=active_vehicles,
            distance_matrix=distance_matrix,
            is_mountain=is_mountain,
            time_limit_per_strategy_seconds=2,
        )

        strategy_meta = [
            {
                "id": "recomendada",
                "name": "Melhor Rota (Recomendada)",
                "description": "Balanço ótimo multiobjetivo entre menores distâncias, janelas prioritárias de SLA e limites seguros de carga.",
                "badge": "Equilibrada",
            },
            {
                "id": "menor_custo",
                "name": "Menor Custo",
                "description": "Otimização focada no menor custo financeiro total em R$ (combustível e custo operacional por km rodado).",
                "badge": "Mais Econômica",
            },
            {
                "id": "menor_tempo",
                "name": "Menor Tempo",
                "description": "Otimização focada na máxima agilidade, menor tempo em trânsito e equilíbrio da jornada de entregas.",
                "badge": "Mais Rápida",
            },
            {
                "id": "menor_peso",
                "name": "Menor Peso",
                "description": "Distribuição suave e homogênea de peso entre os veículos para menor esforço mecânico em aclives e serras.",
                "badge": "Carga Leve",
            },
            {
                "id": "menor_volume",
                "name": "Menor Volume",
                "description": "Otimização de compacidade volumétrica (m³) e melhor aproveitamento de espaço do baú.",
                "badge": "Mais Compacta",
            },
        ]

        strategies_summary_list: List[StrategySummaryCardDTO] = []
        strategies_storage_data: Dict[str, Any] = {}

        for sm in strategy_meta:
            s_id = sm["id"]
            strat_routes, strat_unassigned = all_strategy_results.get(s_id, all_strategy_results["recomendada"])
            dto_list, manifest_md, fuel_l, fuel_cost = self._format_route_dto(strat_routes)

            s_tot_dist = sum(r.total_distance_km for r in dto_list)
            s_tot_weight = sum(r.total_weight_kg for r in dto_list)
            s_tot_vol = sum(r.total_volume_m3 for r in dto_list)
            s_tot_val = sum(sum(st.value_reais for st in r.stops) for r in dto_list)
            s_time_hours = round(s_tot_dist / 45.0, 1)  # Estimativa média 45 km/h operacional
            s_vehicles = [f"{r.emoji} {r.vehicle_name}" for r in dto_list]
            s_stops_count = sum(len(r.stops) for r in dto_list)

            # Resumo executivo leve para retorno no JSON do optimize
            strategies_summary_list.append(
                StrategySummaryCardDTO(
                    strategy_id=s_id,
                    strategy_name=sm["name"],
                    badge_label=sm["badge"],
                    description=sm["description"],
                    total_distance_km=round(s_tot_dist, 2),
                    total_time_hours=s_time_hours,
                    total_weight_kg=round(s_tot_weight, 2),
                    total_volume_m3=round(s_tot_vol, 3),
                    total_value_reais=round(s_tot_val, 2),
                    total_fuel_liters=fuel_l,
                    total_fuel_cost_reais=fuel_cost,
                    vehicles_used=s_vehicles,
                    stops_count=s_stops_count,
                )
            )

            # Armazenamento estruturado no SQLite para recuperação instantânea sob demanda
            unassigned_list = [
                {
                    "order_id": u.order_id,
                    "city": u.city,
                    "address": u.address,
                    "delivery_type": u.delivery_type,
                    "weight_kg": u.weight_kg,
                    "value_reais": u.value_reais,
                    "items_summary": u.items_summary,
                }
                for u in strat_unassigned
            ]

            strategies_storage_data[s_id] = {
                "routes": [r.model_dump() for r in dto_list],
                "manifest_markdown": manifest_md,
                "total_dist": s_tot_dist,
                "total_weight": s_tot_weight,
                "total_vol": s_tot_vol,
                "total_val": s_tot_val,
                "total_fuel_l": fuel_l,
                "total_fuel_cost": fuel_cost,
                "vehicles_used": s_vehicles,
                "unassigned_orders": unassigned_list,
            }

        default_strat = strategies_storage_data["recomendada"]
        routes_json_str = json.dumps(default_strat["routes"], ensure_ascii=False)
        strategies_json_str = json.dumps(strategies_storage_data, ensure_ascii=False)
        vehicles_used_names = default_strat["vehicles_used"]

        # 6. Persistir no SQLite reports.db (armazena as 5 estratégias completas)
        report_id = save_report(
            filename=filename,
            user_prompt=user_prompt,
            total_orders=len(orders_to_route),
            total_weight_kg=default_strat["total_weight"],
            total_distance_km=default_strat["total_dist"],
            manifest_markdown=default_strat["manifest_markdown"],
            routes_json=routes_json_str,
            vehicles_used=", ".join(vehicles_used_names),
            strategies_data_json=strategies_json_str,
        )

        return OptimizeResponse(
            report_id=report_id,
            filename=filename,
            user_prompt=user_prompt,
            total_orders_processed=len(df),
            total_orders_routed=strategies_summary_list[0].stops_count,
            total_pickup_orders=len(pickup_orders),
            total_unassigned_orders=len(default_strat["unassigned_orders"]),
            is_mountain_route=is_mountain,
            safety_factor_label="90% (Serra / Longa Distância)" if is_mountain else "95% (Plano / Urbano)",
            strategies_summary=strategies_summary_list,
            pickup_orders=pickup_orders,
            unassigned_orders=default_strat["unassigned_orders"],
            reasoning=llm_config.get("reasoning"),
        )

    def get_dispatch_summary(
        self, report_id: int, strategy: Optional[str] = "recomendada"
    ) -> DispatchSummaryResponse:
        """
        Recupera instantaneamente os dados consolidados da estratégia escolhida no SQLite (sem reprocessar OR-Tools):
        - valor total, peso total, volume total, distância total e ocupação (%);
        - caminhão selecionado com capacidades e status de combustível;
        - rota definida (recomendada, menor custo, menor tempo, menor peso, menor volume);
        - ordem de carregamento física LIFO (fundo à porta do baú);
        - rotas com GeoJSON e manifesto Markdown para desenhar no mapa e gerar o PDF no front.
        """
        rep = get_report_by_id(report_id)
        if not rep:
            raise HTTPException(status_code=404, detail=f"Relatório de ID {report_id} não encontrado.")

        strategy_clean = (strategy or "recomendada").lower().strip().replace("-", "_")
        strategy_info = {
            "recomendada": ("Melhor Rota (Recomendada)", "Equilibrada", "Balanço ótimo multiobjetivo entre menores distâncias, janelas prioritárias de SLA e limites seguros de carga."),
            "menor_custo": ("Menor Custo", "Mais Econômica", "Otimização focada no menor custo financeiro total em R$ (combustível e custo operacional por km rodado)."),
            "menor_tempo": ("Menor Tempo", "Mais Rápida", "Otimização focada na máxima agilidade, menor tempo em trânsito e equilíbrio da jornada de entregas."),
            "menor_peso": ("Menor Peso", "Carga Leve", "Distribuição suave e homogênea de peso entre os veículos para menor esforço mecânico em aclives e serras."),
            "menor_volume": ("Menor Volume", "Mais Compacta", "Otimização de compacidade volumétrica (m³) e melhor aproveitamento de espaço do baú."),
        }
        strat_name, strat_badge, strat_desc = strategy_info.get(strategy_clean, strategy_info["recomendada"])
        defined_route = DefinedRouteStrategyDTO(
            strategy_id=strategy_clean,
            strategy_name=strat_name,
            badge_label=strat_badge,
            description=strat_desc,
        )

        routes_data = []
        manifest_md = ""
        tot_dist = float(rep["total_distance_km"])
        tot_weight = float(rep["total_weight_kg"])

        # Verificar se as 5 estratégias estão serializadas no SQLite
        strategies_json = rep["strategies_data_json"] if "strategies_data_json" in rep.keys() and rep["strategies_data_json"] else None
        if strategies_json:
            try:
                all_strats = json.loads(strategies_json)
                target_strat = all_strats.get(strategy_clean) or all_strats.get("recomendada")
                if target_strat:
                    routes_data = target_strat.get("routes", [])
                    manifest_md = target_strat.get("manifest_markdown", "")
                    tot_dist = float(target_strat.get("total_dist", tot_dist))
                    tot_weight = float(target_strat.get("total_weight", tot_weight))
            except Exception as e:
                logger.warning(f"Erro ao deserializar strategies_data_json: {e}")

        # Fallback para rota legada em routes_json
        if not routes_data and rep.get("routes_json"):
            routes_data = json.loads(rep["routes_json"])
            manifest_md = rep.get("manifest_markdown", "")

        vehicles_summary: List[VehicleSummaryDTO] = []
        all_loading_orders: List[LoadingOrderItemDTO] = []
        detailed_routes_dto: List[VehicleRouteDTO] = []
        tot_val_all = 0.0
        tot_fuel_l_all = 0.0
        tot_fuel_cost_all = 0.0
        tot_capacity_kg_all = 0

        for r in routes_data:
            try:
                detailed_routes_dto.append(VehicleRouteDTO(**r))
            except Exception:
                pass

            v_stops = r.get("stops", [])
            sorted_stops = sorted(v_stops, key=lambda s: s.get("loading_order_position", 999))

            v_loading_items: List[LoadingOrderItemDTO] = []
            v_tot_val = 0.0

            for s in sorted_stops:
                val = float(s.get("value_reais", 0.0))
                v_tot_val += val
                tot_val_all += val

                item_dto = LoadingOrderItemDTO(
                    loading_order_position=s.get("loading_order_position", 1),
                    loading_order_label=s.get("loading_order_label", f"{s.get('loading_order_position', 1)}º a carregar"),
                    stop_number=s.get("stop_number", 1),
                    order_id=s.get("order_id", ""),
                    city=s.get("city", "CRATEUS"),
                    address=s.get("address"),
                    delivery_type=s.get("delivery_type", "NORMAL"),
                    weight_kg=float(s.get("weight_kg", 0.0)),
                    volume_m3=float(s.get("volume_m3", 0.0)),
                    value_reais=val,
                    items_summary=s.get("items_summary", ""),
                )
                v_loading_items.append(item_dto)
                all_loading_orders.append(item_dto)

            fuel_dict = r.get("fuel_info")
            fuel_dto = VehicleFuelDTO(**fuel_dict) if fuel_dict else None
            if fuel_dto:
                tot_fuel_l_all += fuel_dto.estimated_consumption_liters
                tot_fuel_cost_all += fuel_dto.estimated_cost_reais

            eff_cap = int(r.get("effective_capacity_kg", 1))
            tot_capacity_kg_all += eff_cap

            vehicles_summary.append(
                VehicleSummaryDTO(
                    vehicle_id=r.get("vehicle_id", 0),
                    vehicle_name=r.get("vehicle_name", "Veículo"),
                    color=r.get("color", "Azul"),
                    hex_color=r.get("hex_color", "#2563EB"),
                    emoji=r.get("emoji", "🚚"),
                    effective_capacity_kg=eff_cap,
                    effective_capacity_m3=float(r.get("effective_capacity_m3", 0.0)),
                    safety_factor_label=r.get("safety_factor_label", "95%"),
                    total_weight_kg=float(r.get("total_weight_kg", 0.0)),
                    total_volume_m3=float(r.get("total_volume_m3", 0.0)),
                    total_value_reais=round(v_tot_val, 2),
                    occupancy_rate_percent=float(r.get("occupancy_rate_percent", 0.0)),
                    total_distance_km=float(r.get("total_distance_km", 0.0)),
                    stops_count=len(v_stops),
                    fuel_info=fuel_dto,
                    loading_order=v_loading_items,
                )
            )

        tot_vol = sum(v.total_volume_m3 for v in vehicles_summary)
        overall_occ = round((tot_weight / tot_capacity_kg_all * 100.0), 1) if tot_capacity_kg_all > 0 else 0.0

        return DispatchSummaryResponse(
            report_id=report_id,
            filename=rep["filename"],
            total_value_reais=round(tot_val_all, 2),
            total_weight_kg=round(tot_weight, 2),
            total_volume_m3=round(tot_vol, 3),
            total_distance_km=round(tot_dist, 2),
            overall_occupancy_rate_percent=overall_occ,
            defined_route=defined_route,
            vehicles_count=len(vehicles_summary),
            vehicles=vehicles_summary,
            all_loading_orders=all_loading_orders,
            total_fuel_liters=round(tot_fuel_l_all, 2),
            total_fuel_cost_reais=round(tot_fuel_cost_all, 2),
            manifest_markdown=manifest_md,
            routes=detailed_routes_dto if detailed_routes_dto else None,
        )


routing_service = RoutingService()
