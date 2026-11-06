import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.documents import router as documents_router
from app.api.health import router as health_router
from app.core.handlers import register_error_handlers
from app.core.log_config import configure_logging
from app.core.settings import Settings, get_settings
from app.services.sessions import SessionStore

logger = logging.getLogger("sophia.access")


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    configure_logging(resolved.log_level)
    app = FastAPI(title="Sophia AI", version="0.1.0")
    app.state.settings = resolved
    app.state.sessions = SessionStore()

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        logger.info(
            "request",
            extra={
                "http_method": request.method,
                "http_path": request.url.path,
                "http_status": response.status_code,
                "duration_ms": int((time.perf_counter() - started) * 1000),
            },
        )
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(health_router)
    app.include_router(documents_router)
    return app


app = create_app()
