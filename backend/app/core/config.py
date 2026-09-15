import os
from typing import List, Union
from pydantic import BaseModel, field_validator

# Automatically load .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Settings(BaseModel):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Hackathon Backend API")
    VERSION: str = os.getenv("VERSION", "0.1.0")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    ALLOWED_ORIGINS: Union[List[str], str] = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
    )

    @field_validator("ALLOWED_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
