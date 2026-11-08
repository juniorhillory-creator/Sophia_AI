import asyncio
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse

from app.core.settings import Settings
from app.dependencies import get_current_user, get_ingestion, get_llm, get_rag, get_sessions, get_settings
from app.db.session import get_database
from app.domain.errors import AppError
from app.models.document import Document as DocumentModel
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
from sqlalchemy import select

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
    user_id: UUID = Depends(get_current_user),
) -> Document:
    filename, content_type, data = await read_pdf_upload(request, settings.max_upload_bytes)
    # ingestion.ingest is now async
    return await ingestion.ingest(filename, content_type, data)


async def _get_owned_document(
    document_id: UUID,
    user_id: UUID,
    sessions: SessionStore,
    request: Request,
) -> tuple:
    """Get document from SessionStore and verify ownership via database if connected.
    
    Uses request-scoped cache to avoid repeated DB queries within the same request.
    """
    session = sessions.get(document_id)
    if session is None:
        raise AppError("not_found", "Document not found.", 404)
    
    # Request-scoped cache for ownership verification
    cache_key = f"_owned_docs_{document_id}"
    cached = getattr(request.state, cache_key, None)
    if cached is not None:
        if not cached:
            raise AppError("not_found", "Document not found.", 404)
        return session, cached
    
    # Verify ownership in database if connected
    db = get_database()
    doc_model = None
    if db.is_connected:
        async with db.session() as db_session:
            result = await db_session.execute(
                select(DocumentModel).where(DocumentModel.id == document_id)
            )
            doc_model = result.scalar_one_or_none()
            if doc_model is None or doc_model.user_id != user_id:
                raise AppError("not_found", "Document not found.", 404)
        # Cache successful verification
        setattr(request.state, cache_key, doc_model)
        return session, doc_model
    
    # Database not connected (e.g., in tests) - skip database ownership check
    # SessionStore isolation provides basic protection in test environment
    setattr(request.state, cache_key, True)
    return session, None


@router.get("/{document_id}", response_model=Document)
async def get_document(
    request: Request,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    sessions: SessionStore = Depends(get_sessions),
) -> Document:
    session, _ = await _get_owned_document(document_id, user_id, sessions, request)
    return session.document


@router.get("/{document_id}/chunks", response_model=ChunkList)
async def get_chunks(
    request: Request,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    sessions: SessionStore = Depends(get_sessions),
) -> ChunkList:
    session, _ = await _get_owned_document(document_id, user_id, sessions, request)
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
    request: Request,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    sessions: SessionStore = Depends(get_sessions),
    llm: Llm = Depends(get_llm),
    settings: Settings = Depends(get_settings),
) -> PaperSummary:
    """Summarize the stored paper. Each field is paper text or `Not found in the paper.`"""
    session, _ = await _get_owned_document(document_id, user_id, sessions, request)
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
    request: Request,
    document_id: UUID,
    body: QuestionRequest,
    user_id: UUID = Depends(get_current_user),
    sessions: SessionStore = Depends(get_sessions),
    rag: RagService = Depends(get_rag),
    llm: Llm = Depends(get_llm),
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    """Answer from retrieved chunks. Pages come from those chunks, not from the model."""
    session, _ = await _get_owned_document(document_id, user_id, sessions, request)
    return await asyncio.to_thread(
        rag.answer,
        document_id,
        body.question,
        llm,
        settings.ollama_timeout_seconds,
    )


@router.get("/{document_id}/file")
async def get_document_file(
    request: Request,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    sessions: SessionStore = Depends(get_sessions),
) -> FileResponse:
    """Serve the original PDF file for the viewer."""
    session, _ = await _get_owned_document(document_id, user_id, sessions, request)

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
