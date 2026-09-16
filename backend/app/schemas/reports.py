from typing import Optional
from pydantic import BaseModel


class ReportSummary(BaseModel):
    id: int
    created_at: str
    filename: str
    user_prompt: Optional[str] = None
    total_orders: int
    total_weight_kg: float
    total_distance_km: float
    vehicles_used: str


class ReportDetail(ReportSummary):
    manifest_markdown: str
    routes_json: str
