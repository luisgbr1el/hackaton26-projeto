from fastapi import APIRouter
from app.api.v1.endpoints import health, items, auth, routing, reports

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(routing.router)
api_router.include_router(reports.router)
api_router.include_router(items.router)
