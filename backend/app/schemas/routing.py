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


class VehicleRouteDTO(BaseModel):
    vehicle_id: int
    vehicle_name: str
    color: str
    hex_color: str
    emoji: str
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
    stops: List[RouteStopDTO]
    geojson: Dict[str, Any]
    manifest_markdown: str


class OptimizeResponse(BaseModel):
    report_id: int
    filename: str
    user_prompt: Optional[str] = None
    total_orders_processed: int
    total_orders_routed: int
    total_pickup_orders: int
    total_unassigned_orders: int
    total_distance_km: float
    total_weight_kg: float
    is_mountain_route: bool
    safety_factor_label: str
    vehicles_used: List[str]
    routes: List[VehicleRouteDTO]
    pickup_orders: List[Dict[str, Any]]
    unassigned_orders: List[Dict[str, Any]]
    manifest_markdown: str
    reasoning: Optional[str] = None
