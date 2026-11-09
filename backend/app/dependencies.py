from pathlib import Path
from uuid import UUID

from fastapi import Depends, Request
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError

from app.core.settings import Settings
from app.core.supabase import get_supabase_client, is_supabase_configured
from app.db.session import get_database
from app.domain.errors import AppError
from app.services.ingestion import IngestionService
from app.services.llm import Llm
from app.services.rag import RagService
from app.services.sessions import SessionStore


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_db(request: Request):
    return get_database()


# Module-level caches (initialized at module load)
_public_key_cache: str | None = None
_user_cache: dict[str, bool] = {}


def _load_public_key(settings: Settings) -> str:
    """Load and cache the JWT public key."""
    global _public_key_cache
    if _public_key_cache is None:
        key_path = Path(settings.jwt_public_key_path)
        if not key_path.exists():
            candidate = Path(__file__).resolve().parent.parent / settings.jwt_public_key_path
            if candidate.exists():
                key_path = candidate
        with open(key_path, "r", encoding="utf-8") as f:
            _public_key_cache = f.read()
    return _public_key_cache


def _get_user_cache() -> dict[str, bool]:
    """Return the user existence cache."""
    return _user_cache


async def get_current_user(request: Request) -> UUID:
    """Extract and validate JWT access token, return user_id."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise AppError("unauthorized", "Missing or invalid Authorization header", 401)
    
    token = auth[7:].strip()
    if not token:
        raise AppError("unauthorized", "Missing or invalid Authorization header", 401)

    settings = request.app.state.settings
    if is_supabase_configured(settings):
        sb = get_supabase_client(settings)
        if sb:
            try:
                user_res = sb.auth.get_user(token)
                if user_res and user_res.user:
                    return UUID(user_res.user.id)
            except Exception as e:
                import logging
                logging.getLogger("sophia.auth").warning("supabase_get_user_failed: %s", e)

    public_key = _load_public_key(settings)
    
    try:
        payload = jwt.decode(token, public_key, algorithms=[settings.jwt_algorithm])
    except ExpiredSignatureError:
        raise AppError("token_expired", "Access token has expired", 401)
    except JWTError:
        raise AppError("invalid_token", "Invalid access token", 401)
    
    if payload.get("type") != "access":
        raise AppError("invalid_token", "Invalid token type", 401)
    
    user_id = UUID(payload["sub"])
    
    # Verify user exists and is active (cached)
    cache = _get_user_cache()
    user_id_str = str(user_id)
    if user_id_str in cache:
        if not cache[user_id_str]:
            raise AppError("invalid_token", "Invalid access token", 401)
    else:
        db = get_database()
        if db.is_connected:
            async with db.session() as session:
                from app.models.user import User
                from sqlalchemy import select
                result = await session.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                
                is_valid = user is not None and user.is_active
                cache[user_id_str] = is_valid
                
                if not is_valid:
                    raise AppError("invalid_token", "Invalid access token", 401)
        else:
            # When db not connected (e.g. test environment) - allow but don't cache
            # This prevents test pollution where a fake user appears valid
            pass
    
    return user_id


def get_sessions(request: Request) -> SessionStore:
    return request.app.state.sessions


def get_rag(request: Request) -> RagService:
    return request.app.state.rag


def get_ingestion(request: Request, user_id: UUID = Depends(get_current_user)) -> IngestionService:
    return IngestionService(request.app.state.settings, get_sessions(request), get_rag(request).index, user_id)


def get_llm(request: Request) -> Llm:
    return request.app.state.llm
