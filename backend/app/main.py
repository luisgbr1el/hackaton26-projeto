from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from app.core.config import settings
from app.api.router import api_router
from app.db.sqlite import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and tables
    init_db()
    yield


def create_application() -> FastAPI:
    # Set standard root URLs for OpenAPI, Swagger and ReDoc
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API routes with prefix (e.g. /api/v1)
    application.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # Alias /api/v1/docs and /api/v1/openapi.json so both /docs and /api/v1/docs work seamlessly
    @application.get("/api/v1/openapi.json", include_in_schema=False)
    async def get_api_v1_openapi():
        return application.openapi()

    @application.get("/api/v1/docs", include_in_schema=False)
    async def get_api_v1_docs():
        return get_swagger_ui_html(
            openapi_url="/api/v1/openapi.json",
            title=f"{settings.PROJECT_NAME} - Swagger UI",
            oauth2_redirect_url="/docs/oauth2-redirect",
        )

    @application.get("/api/v1/redoc", include_in_schema=False)
    async def get_api_v1_redoc():
        return get_redoc_html(
            openapi_url="/api/v1/openapi.json",
            title=f"{settings.PROJECT_NAME} - ReDoc",
        )

    from fastapi.responses import RedirectResponse

    @application.get("/", include_in_schema=False)
    async def root():
        return RedirectResponse(url="/docs")

    return application


app = create_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
