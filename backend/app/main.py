import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.health import router as health_router
from app.core.handlers import register_error_handlers
from app.core.log_config import configure_logging
from app.core.settings import Settings, get_settings
<<<<<<< HEAD
from app.core.supabase import get_supabase_client, is_supabase_configured
=======
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
from app.db.session import get_database
from app.infrastructure.chroma_store import ChromaStore
from app.infrastructure.embeddings import Embedder, SentenceTransformerEmbedder
from app.infrastructure.ollama import OllamaClient
from app.services.rag import RagService
from app.services.sessions import SessionStore

logger = logging.getLogger("sophia.access")


@asynccontextmanager
async def lifespan(app: FastAPI):
<<<<<<< HEAD
    settings = app.state.settings
    if is_supabase_configured(settings):
        try:
            get_supabase_client(settings)
            logger.info("supabase_connected")
        except Exception as e:
            logger.warning("supabase_connection_deferred", extra={"error": str(e)})
    else:
        db = get_database()
        try:
            db.connect()
            await db.create_tables()
            logger.info("database_connected")
        except Exception as e:
            logger.warning("database_connection_deferred", extra={"error": str(e)})
    yield
    if not is_supabase_configured(settings):
        db = get_database()
        try:
            await db.disconnect()
            logger.info("database_disconnected")
        except Exception as e:
            logger.warning("database_disconnect_error", extra={"error": str(e)})
=======
    db = get_database()
    try:
        db.connect()
        await db.create_tables()
        logger.info("database_connected")
    except Exception as e:
        logger.warning("database_connection_deferred", extra={"error": str(e)})
    yield
    try:
        await db.disconnect()
        logger.info("database_disconnected")
    except Exception as e:
        logger.warning("database_disconnect_error", extra={"error": str(e)})
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81


def create_app(
    settings: Settings | None = None,
    embedder: Embedder | None = None,
    vectors: ChromaStore | None = None,
) -> FastAPI:
    resolved = settings or get_settings()
    configure_logging(resolved.log_level)
    app = FastAPI(title="Sophia AI", version="0.1.0", lifespan=lifespan)
    app.state.settings = resolved
    app.state.sessions = SessionStore()
<<<<<<< HEAD
    app.state.llm = OllamaClient(
        resolved.ollama_base_url, resolved.ollama_model, resolved.ollama_num_gpu
    )
=======
    app.state.llm = OllamaClient(resolved.ollama_base_url, resolved.ollama_model)
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
    app.state.rag = RagService(
        embedder or SentenceTransformerEmbedder(resolved.embedding_model),
        vectors or ChromaStore.open(resolved.chroma_path),
        resolved.retrieval_top_k,
        resolved.similarity_threshold,
    )

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
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS", "PATCH", "PUT"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(documents_router)
    return app


app = create_app()
