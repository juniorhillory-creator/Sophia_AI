import hashlib
from functools import lru_cache
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from jose import jwt

from app.core.settings import Settings, get_settings
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


# Load public key once at module load using direct Settings instantiation
def _load_public_key() -> str:
    from app.core.settings import Settings
    settings = Settings()
    with open(settings.jwt_public_key_path, "r") as f:
        return f.read()


_PUBLIC_KEY = _load_public_key()


def _get_user_cache() -> dict:
    """Simple in-memory cache for user existence. TTL handled by token expiry."""
    if not hasattr(_get_user_cache, "_cache"):
        _get_user_cache._cache = {}
    return _get_user_cache._cache


async def get_current_user(request: Request) -> UUID:
    """Extract and validate JWT access token, return user_id."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise AppError("unauthorized", "Missing or invalid Authorization header", 401)
    
    token = auth[7:]
    settings = get_settings(request)
    
    try:
        payload = jwt.decode(token, _PUBLIC_KEY, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise AppError("token_expired", "Access token has expired", 401)
    except jwt.JWTError:
        raise AppError("invalid_token", "Invalid access token", 401)
    
    if payload.get("type") != "access":
        raise AppError("invalid_token", "Invalid token type", 401)
    
    user_id = UUID(payload["sub"])
    
    # Verify user exists and is active (cached)
    cache = _get_user_cache()
    if user_id in cache:
        if not cache[user_id]:
            raise AppError("invalid_token", "Invalid access token", 401)
    else:
        db = get_database()
        async with db.session() as session:
            from app.models.user import User
            from sqlalchemy import select
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            is_valid = user is not None and user.is_active
            cache[user_id] = is_valid
            
            if not is_valid:
                raise AppError("invalid_token", "Invalid access token", 401)
    
    return user_id


def get_sessions(request: Request) -> SessionStore:
    return request.app.state.sessions


def get_rag(request: Request) -> RagService:
    return request.app.state.rag


def get_ingestion(request: Request, user_id: UUID = Depends(get_current_user)) -> IngestionService:
    return IngestionService(get_settings(request), get_sessions(request), get_rag(request).index, user_id)


def get_llm(request: Request) -> Llm:
    return request.app.state.llm
