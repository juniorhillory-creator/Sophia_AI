import asyncio
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse

from app.core.settings import Settings
from app.dependencies import get_ingestion, get_llm, get_rag, get_sessions, get_settings
from app.domain.errors import AppError
from app.schemas.models import (
    ChatResponse,
    ChunkList,
    Document,
    ErrorBody,
    PaperSummary,
    QuestionRequest,
)
from app.services.ingestion import IngestionService
from app.services.llm import Llm
from app.services.rag import RagService
from app.services.sessions import SessionStore
from app.services.summary import summarize
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


_SUMMARY_ERRORS = {
    404: {"model": ErrorBody},
    502: {"model": ErrorBody},
    503: {"model": ErrorBody},
    504: {"model": ErrorBody},
}


@router.post(
    "/{document_id}/summary",
    response_model=PaperSummary,
    responses=_SUMMARY_ERRORS,
)
async def create_summary(
    document_id: UUID,
    sessions: SessionStore = Depends(get_sessions),
    llm: Llm = Depends(get_llm),
    settings: Settings = Depends(get_settings),
) -> PaperSummary:
    """Summarize the stored paper. Each field is paper text or `Not found in the paper.`"""
    session = sessions.get(document_id)
    if session is None:
        raise AppError("not_found", "Document not found.", 404)
    return await asyncio.to_thread(
        summarize,
        session.pages,
        llm,
        settings.ollama_timeout_seconds,
    )


@router.post(
    "/{document_id}/questions",
    response_model=ChatResponse,
    responses=_SUMMARY_ERRORS,
)
async def ask_question(
    document_id: UUID,
    body: QuestionRequest,
    sessions: SessionStore = Depends(get_sessions),
    rag: RagService = Depends(get_rag),
    llm: Llm = Depends(get_llm),
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    """Answer from retrieved chunks. Pages come from those chunks, not from the model."""
    if sessions.get(document_id) is None:
        raise AppError("not_found", "Document not found.", 404)
    return await asyncio.to_thread(
        rag.answer,
        document_id,
        body.question,
        llm,
        settings.ollama_timeout_seconds,
    )


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: UUID,
    settings: Settings = Depends(get_settings),
    sessions: SessionStore = Depends(get_sessions),
) -> FileResponse:
    """Serve the original PDF file for the viewer."""
    session = sessions.get(document_id)
    if session is None:
        raise AppError("not_found", "Document not found.", 404)

    # Find the PDF file in the data directory
    data_dir = Path(settings.chroma_path).parent / "documents" / str(document_id)
    pdf_path = data_dir / "original.pdf"

    if not pdf_path.exists():
        raise AppError("not_found", "Document file not found.", 404)

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=session.document.filename,
    )
