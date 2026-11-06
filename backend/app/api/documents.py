import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.core.settings import Settings
from app.dependencies import get_ingestion, get_sessions, get_settings
from app.domain.errors import AppError
from app.schemas.models import ChunkList, Document
from app.services.ingestion import IngestionService
from app.services.sessions import SessionStore
from app.services.uploads import read_pdf_upload

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

_UPLOAD_BODY = {
    "requestBody": {
        "required": True,
        "content": {
            "multipart/form-data": {
                "schema": {
                    "type": "object",
                    "required": ["file"],
                    "properties": {"file": {"type": "string", "format": "binary"}},
                }
            }
        },
    }
}


@router.post("", response_model=Document, status_code=201, openapi_extra=_UPLOAD_BODY)
async def upload_document(
    request: Request,
    settings: Settings = Depends(get_settings),
    ingestion: IngestionService = Depends(get_ingestion),
) -> Document:
    filename, content_type, data = await read_pdf_upload(request, settings.max_upload_bytes)
    return await asyncio.to_thread(ingestion.ingest, filename, content_type, data)


@router.get("/{document_id}", response_model=Document)
def get_document(
    document_id: UUID,
    sessions: SessionStore = Depends(get_sessions),
) -> Document:
    session = sessions.get(document_id)
    if session is None:
        raise AppError("not_found", "Document not found.", 404)
    return session.document


@router.get("/{document_id}/chunks", response_model=ChunkList)
def get_chunks(
    document_id: UUID,
    sessions: SessionStore = Depends(get_sessions),
) -> ChunkList:
    session = sessions.get(document_id)
    if session is None:
        raise AppError("not_found", "Document not found.", 404)
    return ChunkList(document_id=session.document.id, chunks=session.chunks)
