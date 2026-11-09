import json
import logging
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""
    supabase_jwt_secret: str = ""

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sophia_ai"
    database_echo: bool = False

    # Auth
    jwt_algorithm: str = "RS256"
    jwt_private_key_path: str = "keys/private.pem"
    jwt_public_key_path: str = "keys/public.pem"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Password hashing (Argon2)
    argon2_time_cost: int = 3
    argon2_memory_cost: int = 65536
    argon2_parallelism: int = 4

    # Google OAuth
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:5173/auth/google/callback"

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    email_from: str = "noreply@sophia-ai.local"
    email_verification_url: str = "http://localhost:5173/auth/verify-email"
    password_reset_url: str = "http://localhost:5173/auth/reset-password"

    # App
    max_upload_bytes: int = 20 * 1024 * 1024
    chunk_size: int = 1200
    chunk_overlap: int = 150
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:5174"]
    )
    log_level: str = "INFO"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    llm_timeout_seconds: float = 120
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.2"
    ollama_timeout_seconds: float = 120
    ollama_num_gpu: int | None = None
    embedding_model: str = "all-MiniLM-L6-v2"
    chroma_path: str = "data/chroma"
    retrieval_top_k: int = 4
    similarity_threshold: float = 0.3

    @field_validator("log_level")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        normalized = value.upper()
        if normalized not in logging.getLevelNamesMapping():
            raise ValueError(f"Unknown log level: {value}")
        return normalized

    @field_validator("embedding_model")
    @classmethod
    def require_embedding_model(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("embedding_model must not be blank")
        return stripped

    @field_validator("chroma_path")
    @classmethod
    def require_chroma_path(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("chroma_path must not be blank")
        return stripped

    @field_validator("ollama_model")
    @classmethod
    def require_model_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("ollama_model must not be blank")
        return stripped

    @field_validator("ollama_base_url")
    @classmethod
    def require_ollama_url(cls, value: str) -> str:
        stripped = value.strip().rstrip("/")
        if not stripped.startswith(("http://", "https://")):
            raise ValueError("ollama_base_url must be an http(s) URL")
        return stripped

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                parsed = json.loads(stripped)
                if not isinstance(parsed, list):
                    raise ValueError("CORS_ORIGINS must be a list")
                return parsed
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("database_url must not be blank")
        if not stripped.startswith(("postgresql+asyncpg://", "postgresql://", "sqlite+aiosqlite://")):
            raise ValueError("database_url must be a PostgreSQL or SQLite async URL")
        return stripped

    @field_validator("jwt_algorithm")
    @classmethod
    def validate_jwt_algorithm(cls, value: str) -> str:
        if value not in ("RS256", "RS512", "HS256", "HS512"):
            raise ValueError("jwt_algorithm must be RS256, RS512, HS256, or HS512")
        return value

    @field_validator("access_token_expire_minutes")
    @classmethod
    def validate_access_token_expire(cls, value: int) -> int:
        if value < 1 or value > 1440:  # max 24 hours
            raise ValueError("access_token_expire_minutes must be between 1 and 1440")
        return value

    @field_validator("refresh_token_expire_days")
    @classmethod
    def validate_refresh_token_expire(cls, value: int) -> int:
        if value < 1 or value > 90:  # max 90 days
            raise ValueError("refresh_token_expire_days must be between 1 and 90")
        return value

    @model_validator(mode="after")
    def check_limits(self) -> "Settings":
        if self.max_upload_bytes < 1:
            raise ValueError("max_upload_bytes must be positive")
        if self.chunk_size < 1:
            raise ValueError("chunk_size must be positive")
        if self.chunk_overlap < 0 or self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be >= 0 and smaller than chunk_size")
        if self.llm_timeout_seconds <= 0:
            raise ValueError("llm_timeout_seconds must be positive")
        if self.ollama_timeout_seconds <= 0:
            raise ValueError("ollama_timeout_seconds must be positive")
        if self.retrieval_top_k not in (3, 4):
            raise ValueError("retrieval_top_k must be 3 or 4")
        if not 0 <= self.similarity_threshold <= 1:
            raise ValueError("similarity_threshold must be from 0 to 1")
        if self.argon2_time_cost < 1:
            raise ValueError("argon2_time_cost must be >= 1")
        if self.argon2_memory_cost < 8192:
            raise ValueError("argon2_memory_cost must be >= 8192")
        if self.argon2_parallelism < 1:
            raise ValueError("argon2_parallelism must be >= 1")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
