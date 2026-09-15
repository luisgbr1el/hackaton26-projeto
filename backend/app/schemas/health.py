from datetime import datetime, timezone
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", examples=["healthy"])
    project: str = Field(default="Hackathon Backend API")
    version: str = Field(default="0.1.0")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
