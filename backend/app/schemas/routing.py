from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class PreviewOrderDTO(BaseModel):
    order_id: str
    city: str
    delivery_type: str
    value_reais: float
    weight_kg: float
    volume_m3: float
    items_summary: str
    address: Optional[str] = None
    is_intra_city: bool = False
    route_type: str = "POLO_LOCALIDADE"


class DateFilterMetadataDTO(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_orders_before_filter: int
    orders_retained: int
    orders_filtered_out: int
    applied: bool = False


class RecommendedTruckDTO(BaseModel):
    vehicle_id: int
    vehicle_name: str
    license_plate: str
    color: str
    hex_color: str
    emoji: str
    effective_capacity_kg: int
    effective_capacity_m3: float
    total_batch_weight_kg: float
    total_batch_volume_m3: float
    estimated_occupancy_percent: float
    reason: str


class PreviewResponse(BaseModel):
    filename: str
    total_orders: int
    orders_for_delivery: int
    pickup_orders_count: int
    delivery_types_count: Dict[str, int]
    cities_found: List[str]
    estimated_total_weight_kg: float
    is_mountain_route: bool
    pickup_orders: List[Dict[str, Any]]
    sample_orders: List[PreviewOrderDTO]
    date_filter_applied: Optional[DateFilterMetadataDTO] = None


class RouteStopDTO(BaseModel):
    stop_number: int
    order_id: str
    city: str
    delivery_type: str
    weight_kg: float
    volume_m3: float
    value_reais: float
    items_summary: str
    lat: float
    lon: float
    distance_from_prev_km: float
    cumulative_distance_km: float
    loading_order_position: int
    loading_order_label: str
    address: Optional[str] = None
    is_intra_city: bool = False
    route_type: str = "POLO_LOCALIDADE"
    trip_number: int = 1
    occupancy_after_loading_percent: float = 0.0


class VehicleFuelDTO(BaseModel):
    fuel_type: str
    tank_capacity_liters: float
    avg_consumption_kml: float
    estimated_consumption_liters: float
    estimated_cost_reais: float
    max_autonomy_km: float
    remaining_fuel_liters: float
    needs_refuel: bool
    fuel_status: str
    message: str


class VehicleRouteDTO(BaseModel):
    vehicle_id: int
    vehicle_name: str
    license_plate: str = "CRA-0000"
    color: str
    hex_color: str
    emoji: str
    is_recommended: bool = False
    recommendation_reason: Optional[str] = None
    total_distance_km: float
    total_weight_kg: float
    total_volume_m3: float
    effective_capacity_kg: int
    effective_capacity_m3: float
    safety_factor_label: str
    occupancy_rate_percent: float
    meets_minimum_load: bool
    has_topics: bool
    has_urgent: bool
    stops_count: int
    intra_city_stops_count: int = 0
    inter_city_stops_count: int = 0
    fuel_info: Optional[VehicleFuelDTO] = None
    stops: List[RouteStopDTO]
    geojson: Dict[str, Any]
    manifest_markdown: str
    trips_count: int = 1


class StrategySummaryCardDTO(BaseModel):
    strategy_id: str
    strategy_name: str
    badge_label: str
    description: str
    total_distance_km: float
    total_time_hours: float
    total_weight_kg: float
    total_volume_m3: float
    total_value_reais: float
    total_fuel_liters: float
    total_fuel_cost_reais: float
    vehicles_used: List[str]
    stops_count: int


class RouteOptionDTO(BaseModel):
    strategy_id: str
    strategy_name: str
    description: str
    badge_label: str
    total_distance_km: float
    total_time_hours: float
    total_weight_kg: float
    total_volume_m3: float
    total_value_reais: float
    total_fuel_liters: float
    total_fuel_cost_reais: float
    vehicles_used: List[str]
    routes: List[VehicleRouteDTO]
    manifest_markdown: str
    is_selected: bool = False


class OptimizeResponse(BaseModel):
    report_id: int
    filename: str
    user_prompt: Optional[str] = None
    total_orders_processed: int
    total_orders_routed: int
    total_pickup_orders: int
    total_unassigned_orders: int
    total_batch_value_reais: float = 0.0
    total_batch_weight_kg: float = 0.0
    total_batch_volume_m3: float = 0.0
    total_batch_orders: int = 0
    routed_value_reais: float = 0.0
    unassigned_value_reais: float = 0.0
    pickup_value_reais: float = 0.0
    is_mountain_route: bool
    safety_factor_label: str
    strategies_summary: List[StrategySummaryCardDTO]
    recommended_truck: Optional[RecommendedTruckDTO] = None
    date_filter_applied: Optional[DateFilterMetadataDTO] = None
    pickup_orders: List[Dict[str, Any]] = []
    unassigned_orders: List[Dict[str, Any]] = []
    reasoning: Optional[str] = None


class LoadingOrderItemDTO(BaseModel):
    loading_order_position: int
    loading_order_label: str
    stop_number: int
    order_id: str
    city: str
    address: Optional[str] = None
    delivery_type: str
    weight_kg: float
    volume_m3: float
    value_reais: float
    items_summary: str
    trip_number: int = 1
    occupancy_after_loading_percent: float = 0.0


class VehicleSummaryDTO(BaseModel):
    vehicle_id: int
    vehicle_name: str
    license_plate: str = "CRA-0000"
    color: str
    hex_color: str
    emoji: str
    is_recommended: bool = False
    recommendation_reason: Optional[str] = None
    effective_capacity_kg: int
    effective_capacity_m3: float
    safety_factor_label: str
    total_weight_kg: float
    total_volume_m3: float
    total_value_reais: float
    occupancy_rate_percent: float
    total_distance_km: float
    stops_count: int
    fuel_info: Optional[VehicleFuelDTO] = None
    loading_order: List[LoadingOrderItemDTO] = []
    trips_count: int = 1


class DefinedRouteStrategyDTO(BaseModel):
    strategy_id: str
    strategy_name: str
    badge_label: str
    description: str


class DispatchSummaryResponse(BaseModel):
    report_id: int
    filename: str
    total_value_reais: float
    total_batch_value_reais: float = 0.0
    total_batch_weight_kg: float = 0.0
    total_batch_volume_m3: float = 0.0
    total_batch_orders: int = 0
    routed_value_reais: float = 0.0
    unassigned_value_reais: float = 0.0
    pickup_value_reais: float = 0.0
    total_fleet_capacity_kg: int = 0
    total_fleet_capacity_m3: float = 0.0
    total_weight_kg: float
    total_volume_m3: float
    total_distance_km: float
    overall_occupancy_rate_percent: float
    defined_route: DefinedRouteStrategyDTO
    vehicles_count: int
    vehicles: List[VehicleSummaryDTO]
    all_loading_orders: List[LoadingOrderItemDTO]
    recommended_truck: Optional[RecommendedTruckDTO] = None
    date_filter_applied: Optional[DateFilterMetadataDTO] = None
    total_fuel_liters: float
    total_fuel_cost_reais: float
    manifest_markdown: Optional[str] = None
    routes: Optional[List[VehicleRouteDTO]] = None



