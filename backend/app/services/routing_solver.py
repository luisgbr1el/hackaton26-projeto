import logging
from typing import List, Dict, Any, Tuple, Optional
from ortools.constraint_solver import routing_enums_pb2, pywrapcp
from app.services.fleet_service import VehicleConfig, FleetService, OFFICIAL_FLEET
from app.services.geocoding_service import HUB_CRATEUS, PONTO_TOPICS

logger = logging.getLogger(__name__)


class DeliveryOrder:
    def __init__(
        self,
        order_id: str,
        city: str,
        delivery_type: str,
        weight_kg: float,
        volume_m3: float,
        value_reais: float,
        items_summary: str,
        lat: float,
        lon: float,
        date_str: str = "",
        address: str = "",
        is_intra_city: bool = False,
        route_type: str = "POLO_LOCALIDADE",
    ):
        self.order_id = order_id
        self.city = city.strip().upper()
        self.delivery_type = delivery_type.strip().upper()
        self.weight_kg = weight_kg
        self.volume_m3 = volume_m3
        self.value_reais = value_reais
        self.items_summary = items_summary
        self.lat = lat
        self.lon = lon
        self.date_str = date_str
        self.address = address
        self.is_intra_city = is_intra_city
        self.route_type = route_type


class RouteStop:
    def __init__(
        self,
        stop_number: int,
        order: DeliveryOrder,
        distance_from_prev_km: float,
        cumulative_distance_km: float,
        loading_order_position: int,
        loading_order_label: str,
    ):
        self.stop_number = stop_number
        self.order = order
        self.distance_from_prev_km = distance_from_prev_km
        self.cumulative_distance_km = cumulative_distance_km
        self.loading_order_position = loading_order_position
        self.loading_order_label = loading_order_label

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stop_number": self.stop_number,
            "order_id": self.order.order_id,
            "city": self.order.city,
            "delivery_type": self.order.delivery_type,
            "weight_kg": self.order.weight_kg,
            "volume_m3": self.order.volume_m3,
            "value_reais": self.order.value_reais,
            "items_summary": self.order.items_summary,
            "lat": self.order.lat,
            "lon": self.order.lon,
            "distance_from_prev_km": round(self.distance_from_prev_km, 2),
            "cumulative_distance_km": round(self.cumulative_distance_km, 2),
            "loading_order_position": self.loading_order_position,
            "loading_order_label": self.loading_order_label,
            "address": self.order.address,
            "is_intra_city": self.order.is_intra_city,
            "route_type": self.order.route_type,
        }


class VehicleRouteResult:
    def __init__(
        self,
        vehicle: VehicleConfig,
        stops: List[RouteStop],
        total_distance_km: float,
        total_weight_kg: float,
        total_volume_m3: float,
        effective_capacity_kg: int,
        effective_capacity_m3: float,
        safety_factor_label: str,
        occupancy_rate_percent: float,
        meets_minimum_load: bool,
        has_topics: bool,
        has_urgent: bool,
        coordinates_path: List[Tuple[float, float]],
        geojson_feature: Dict[str, Any],
        manifest_markdown: str = "",
    ):
        self.vehicle = vehicle
        self.stops = stops
        self.total_distance_km = total_distance_km
        self.total_weight_kg = total_weight_kg
        self.total_volume_m3 = total_volume_m3
        self.effective_capacity_kg = effective_capacity_kg
        self.effective_capacity_m3 = effective_capacity_m3
        self.safety_factor_label = safety_factor_label
        self.occupancy_rate_percent = occupancy_rate_percent
        self.meets_minimum_load = meets_minimum_load
        self.has_topics = has_topics
        self.has_urgent = has_urgent
        self.coordinates_path = coordinates_path
        self.geojson_feature = geojson_feature
        self.manifest_markdown = manifest_markdown
        self.intra_city_stops_count = sum(1 for s in stops if s.order.is_intra_city)
        self.inter_city_stops_count = sum(1 for s in stops if not s.order.is_intra_city)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle_id": self.vehicle.id,
            "vehicle_name": self.vehicle.name,
            "color": self.vehicle.color,
            "hex_color": self.vehicle.hex_color,
            "emoji": self.vehicle.emoji,
            "total_distance_km": round(self.total_distance_km, 2),
            "total_weight_kg": round(self.total_weight_kg, 2),
            "total_volume_m3": round(self.total_volume_m3, 3),
            "effective_capacity_kg": self.effective_capacity_kg,
            "effective_capacity_m3": self.effective_capacity_m3,
            "safety_factor_label": self.safety_factor_label,
            "occupancy_rate_percent": round(self.occupancy_rate_percent, 1),
            "meets_minimum_load": self.meets_minimum_load,
            "has_topics": self.has_topics,
            "has_urgent": self.has_urgent,
            "stops": [s.to_dict() for s in self.stops],
            "stops_count": len(self.stops),
            "intra_city_stops_count": self.intra_city_stops_count,
            "inter_city_stops_count": self.inter_city_stops_count,
            "geojson": self.geojson_feature,
            "manifest_markdown": self.manifest_markdown,
        }


class RoutingSolver:
    def solve(
        self,
        orders: List[DeliveryOrder],
        active_vehicles: List[VehicleConfig],
        distance_matrix: List[List[int]],
        is_mountain: bool,
        time_limit_seconds: int = 5,
    ) -> Tuple[List[VehicleRouteResult], List[DeliveryOrder]]:
        """
        Executa a otimização matemática de CVRP com o Google OR-Tools.
        Retorna (rotas_dos_veiculos, pedidos_descartados_ou_pendentes).
        """
        num_orders = len(orders)
        num_vehicles = len(active_vehicles)

        if num_orders == 0 or num_vehicles == 0:
            return [], orders

        # Node 0 is Depot (Crateús)
        num_nodes = num_orders + 1
        manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, 0)
        routing = pywrapcp.RoutingModel(manager)

        # 1. Distances Callback & Objective
        def distance_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # 2. Capacidades de Peso (kg) com teto seguro (90% serra vs 95% urbano)
        weight_capacities = []
        for v in active_vehicles:
            if is_mountain:
                cap = v.serra_weight_kg if v.operates_in_mountain else 0
            else:
                cap = v.urbano_weight_kg
            weight_capacities.append(cap)

        def weight_demand_callback(from_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            if from_node == 0:
                return 0
            return int(orders[from_node - 1].weight_kg)

        weight_callback_index = routing.RegisterUnaryTransitCallback(weight_demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            weight_callback_index,
            0,  # null capacity slack
            weight_capacities,
            True,  # start cumul to zero
            "WeightCapacity",
        )

        # 3. Capacidades de Volume (em litros / dm³ inteiros para precisão)
        vol_capacities = []
        for v in active_vehicles:
            if is_mountain:
                cap_vol = v.serra_volume_m3 if v.operates_in_mountain else 0.0
            else:
                cap_vol = v.urbano_volume_m3
            vol_capacities.append(int(cap_vol * 1000))

        def vol_demand_callback(from_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            if from_node == 0:
                return 0
            return int(orders[from_node - 1].volume_m3 * 1000)

        vol_callback_index = routing.RegisterUnaryTransitCallback(vol_demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            vol_callback_index,
            0,
            vol_capacities,
            True,
            "VolumeCapacity",
        )

        # 4. Disjunções e Penalidades por Tipo de Entrega
        # URGENTE: penalidade máxima (1.000.000) -> Inclusão mandatória
        # NORMAL: penalidade padrão (100.000)
        # TOPIC: penalidade alta (500.000)
        # PROGRAMADO: penalidade baixa (5.000) -> Entra apenas com sobra de espaço
        for i, order in enumerate(orders):
            node_index = manager.NodeToIndex(i + 1)
            order_type = order.delivery_type.upper()

            if order_type == "URGENTE":
                penalty = 1_000_000
            elif order_type == "TOPIC":
                penalty = 500_000
            elif order_type == "PROGRAMADO":
                penalty = 5_000
            else:
                penalty = 100_000

            routing.AddDisjunction([node_index], penalty)

            # Restrição para veículos específicos (ex: Moto não leva peso > 300kg e não vai para serra)
            for v_idx, v in enumerate(active_vehicles):
                if "Moto" in v.name:
                    if order.weight_kg > 300 or is_mountain or order.city in [
                        "BURITI DOS MONTES", "PORANGA", "IPAPORANGA", "MONTE NEBO", "IBIAPABA"
                    ]:
                        routing.VehicleVar(node_index).RemoveValue(v_idx)

        # 5. Parâmetros de Busca do Solver
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = time_limit_seconds

        # 6. Resolução
        solution = routing.SolveWithParameters(search_parameters)

        routes_result: List[VehicleRouteResult] = []
        unassigned_orders: List[DeliveryOrder] = []

        if not solution:
            logger.warning("OR-Tools não encontrou solução viável com os parâmetros fornecidos.")
            return [], orders

        # 7. Extração das Rotas e Cálculo de LIFO (Precedência Reversa)
        assigned_node_indices = set()

        for vehicle_idx, vehicle in enumerate(active_vehicles):
            index = routing.Start(vehicle_idx)
            raw_stops: List[Tuple[DeliveryOrder, float]] = []
            cumul_distance_km = 0.0

            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                next_index = solution.Value(routing.NextVar(index))
                next_node = manager.IndexToNode(next_index)

                if next_node != 0:
                    order = orders[next_node - 1]
                    leg_dist_km = distance_matrix[node][next_node] / 1000.0
                    cumul_distance_km += leg_dist_km
                    raw_stops.append((order, leg_dist_km))
                    assigned_node_indices.add(next_node)

                index = next_index

            if not raw_stops:
                continue

            total_stops_count = len(raw_stops)
            stops: List[RouteStop] = []
            running_dist_km = 0.0

            # LIFO Precedence:
            # First stop visited (index 0) is last to be loaded into the trunk (near the door).
            # Last stop visited (index total_stops_count - 1) is 1st to be loaded (deep inside).
            for stop_idx, (ord_item, leg_km) in enumerate(raw_stops):
                running_dist_km += leg_km
                stop_num = stop_idx + 1
                loading_pos = total_stops_count - stop_idx
                if loading_pos == 1:
                    loading_label = "1º a carregar (Fundo do Baú)"
                elif loading_pos == total_stops_count:
                    loading_label = f"{loading_pos}º a carregar (Porta do Baú)"
                else:
                    loading_label = f"{loading_pos}º a carregar (Meio do Baú)"

                stops.append(
                    RouteStop(
                        stop_number=stop_num,
                        order=ord_item,
                        distance_from_prev_km=leg_km,
                        cumulative_distance_km=running_dist_km,
                        loading_order_position=loading_pos,
                        loading_order_label=loading_label,
                    )
                )

            # Return trip to Depot
            last_stop_node = manager.IndexToNode(raw_stops[-1][0].order_id if False else orders.index(raw_stops[-1][0]) + 1)
            return_leg_km = distance_matrix[last_stop_node][0] / 1000.0
            total_route_distance_km = running_dist_km + return_leg_km

            total_weight = sum(s.order.weight_kg for s in stops)
            total_vol = sum(s.order.volume_m3 for s in stops)

            effective_cap_kg = vehicle.serra_weight_kg if (is_mountain and vehicle.operates_in_mountain) else vehicle.urbano_weight_kg
            effective_cap_m3 = vehicle.serra_volume_m3 if (is_mountain and vehicle.operates_in_mountain) else vehicle.urbano_volume_m3
            safety_label = "90% (Serra / Longa Distância)" if is_mountain else "95% (Plano / Urbano)"

            occupancy_percent = (total_weight / effective_cap_kg * 100.0) if effective_cap_kg > 0 else 0.0
            # Accelo check: >= 60% occupancy or contains urgent orders
            has_urgent = any(s.order.delivery_type == "URGENTE" for s in stops)
            has_topics = any(s.order.delivery_type == "TOPIC" for s in stops)

            if vehicle.nominal_weight_kg >= 4000:
                meets_min = occupancy_percent >= 60.0 or has_urgent
            else:
                meets_min = True

            # Coordinates path: Depot -> Stop 1 -> ... -> Stop K -> Depot
            coords_path = [(HUB_CRATEUS["lat"], HUB_CRATEUS["lon"])]
            for s in stops:
                coords_path.append((s.order.lat, s.order.lon))
            coords_path.append((HUB_CRATEUS["lat"], HUB_CRATEUS["lon"]))

            geojson_feature = {
                "type": "Feature",
                "properties": {
                    "vehicle_id": vehicle.id,
                    "vehicle_name": vehicle.name,
                    "color": vehicle.color,
                    "hex_color": vehicle.hex_color,
                    "emoji": vehicle.emoji,
                    "total_distance_km": round(total_route_distance_km, 2),
                    "total_weight_kg": round(total_weight, 2),
                    "occupancy_rate_percent": round(occupancy_percent, 1),
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[lon, lat] for lat, lon in coords_path],
                },
            }

            routes_result.append(
                VehicleRouteResult(
                    vehicle=vehicle,
                    stops=stops,
                    total_distance_km=total_route_distance_km,
                    total_weight_kg=total_weight,
                    total_volume_m3=total_vol,
                    effective_capacity_kg=effective_cap_kg,
                    effective_capacity_m3=effective_cap_m3,
                    safety_factor_label=safety_label,
                    occupancy_rate_percent=occupancy_percent,
                    meets_minimum_load=meets_min,
                    has_topics=has_topics,
                    has_urgent=has_urgent,
                    coordinates_path=coords_path,
                    geojson_feature=geojson_feature,
                )
            )

        # Unassigned orders
        for i, order in enumerate(orders):
            if (i + 1) not in assigned_node_indices:
                unassigned_orders.append(order)

        return routes_result, unassigned_orders


routing_solver = RoutingSolver()
