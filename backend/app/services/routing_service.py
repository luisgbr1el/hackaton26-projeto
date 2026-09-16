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
from app.db.sqlite import save_report
from app.schemas.routing import (
    PreviewResponse,
    PreviewOrderDTO,
    OptimizeResponse,
    VehicleRouteDTO,
    RouteStopDTO,
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

        # 5. Run OR-Tools CVRP Solver
        route_results, unassigned = routing_solver.solve(
            orders=orders_to_route,
            active_vehicles=active_vehicles,
            distance_matrix=distance_matrix,
            is_mountain=is_mountain,
            time_limit_seconds=5,
        )

        # 6. Generate Manifests and Format Results
        total_distance = sum(r.total_distance_km for r in route_results)
        total_weight = sum(r.total_weight_kg for r in route_results)
        vehicles_used_names = [f"{r.vehicle.emoji} {r.vehicle.name}" for r in route_results]

        full_manifest_parts = []
        routes_dto_list: List[VehicleRouteDTO] = []

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
        routes_json_str = json.dumps([r.model_dump() for r in routes_dto_list], ensure_ascii=False)

        # 7. Persist to SQLite reports.db
        report_id = save_report(
            filename=filename,
            user_prompt=user_prompt,
            total_orders=len(orders_to_route),
            total_weight_kg=total_weight,
            total_distance_km=total_distance,
            manifest_markdown=combined_manifest,
            routes_json=routes_json_str,
            vehicles_used=", ".join(vehicles_used_names),
        )

        unassigned_dto = [
            {
                "order_id": u.order_id,
                "city": u.city,
                "address": u.address,
                "delivery_type": u.delivery_type,
                "weight_kg": u.weight_kg,
                "value_reais": u.value_reais,
                "items_summary": u.items_summary,
            }
            for u in unassigned
        ]

        total_intra = sum(r.intra_city_stops_count for r in route_results)
        total_inter = sum(r.inter_city_stops_count for r in route_results)

        return OptimizeResponse(
            report_id=report_id,
            filename=filename,
            user_prompt=user_prompt,
            total_orders_processed=len(df),
            total_orders_routed=sum(len(r.stops) for r in route_results),
            total_pickup_orders=len(pickup_orders),
            total_unassigned_orders=len(unassigned),
            total_distance_km=round(total_distance, 2),
            total_weight_kg=round(total_weight, 2),
            is_mountain_route=is_mountain,
            safety_factor_label="90% (Serra / Longa Distância)" if is_mountain else "95% (Plano / Urbano)",
            vehicles_used=vehicles_used_names,
            total_intra_city_stops=total_intra,
            total_inter_city_stops=total_inter,
            routes=routes_dto_list,
            pickup_orders=pickup_orders,
            unassigned_orders=unassigned_dto,
            manifest_markdown=combined_manifest,
            reasoning=llm_config.get("reasoning"),
        )


routing_service = RoutingService()
