from fastapi import Request

from app.core.settings import Settings
from app.services.ingestion import IngestionService
from app.services.sessions import SessionStore


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_sessions(request: Request) -> SessionStore:
    return request.app.state.sessions


def get_ingestion(request: Request) -> IngestionService:
    return IngestionService(get_settings(request), get_sessions(request))
