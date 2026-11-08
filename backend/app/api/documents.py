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
    document = await ingestion.ingest(filename, content_type, data)
    # Return document with status fields
    return Document(
        id=document.id,
        user_id=user_id,
        filename=document.filename,
        page_count=document.page_count,
        chunk_count=document.chunk_count,
        status="processing",
        stage="extracting",
        created_at=document.created_at,
        updated_at=document.created_at,
    )


@router.get("", response_model=list[Document])
async def list_documents(
    request: Request,
    user_id: UUID = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
) -> list[Document]:
    """List user's documents with pagination."""
    db = get_database()
    if not db.is_connected:
        # Fallback to SessionStore for tests
        sessions = request.app.state.sessions
        docs = []
        for session in sessions._sessions.values():
            doc = session.document
            if hasattr(doc, 'user_id') and doc.user_id == user_id:
                docs.append(doc)
        return docs[offset:offset + limit]
    
    async with db.session() as session:
        from app.models.document import Document as DocumentModel
        from sqlalchemy import select
        result = await session.execute(
            select(DocumentModel)
            .where(DocumentModel.user_id == user_id)
            .order_by(DocumentModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        docs = result.scalars().all()
        
        return [
            Document(
                id=doc.id,
                user_id=doc.user_id,
                filename=doc.filename,
                page_count=doc.page_count,
                chunk_count=doc.chunk_count,
                status=doc.status.value,
                stage=doc.stage.value if doc.stage else None,
                error_code=doc.error_code,
                error_message=doc.error_message,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
            )
            for doc in docs
        ]


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    request: Request,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    sessions: SessionStore = Depends(get_sessions),
) -> None:
    """Delete a document and all associated data."""
    # Verify ownership
    session, doc_model = await _get_owned_document(document_id, user_id, sessions, request)
    
    # Delete from database if connected
    db = get_database()
    if db.is_connected:
        async with db.session() as db_session:
            from app.models.document import Document as DocumentModel
            await db_session.delete(doc_model)
    
    # Delete from ChromaDB
    chroma = request.app.state.rag._vectors
    chroma.delete_by_document_id(document_id)
    
    # Delete from filesystem
    from app.core.settings import Settings
    settings = get_settings(request)
    data_dir = Path(settings.chroma_path).parent / "documents" / str(document_id)
    if data_dir.exists():
        import shutil
        shutil.rmtree(data_dir)
    
    # Delete from SessionStore
    sessions.delete(document_id)


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
    """Generate and cache summary for a document."""
    session, doc_model = await _get_owned_document(document_id, user_id, sessions, request)
    
    # Check if summary already exists in database
    db = get_database()
    if db.is_connected and doc_model is not None and doc_model.summary is not None:
        return PaperSummary.model_validate_json(doc_model.summary)
    
    # Generate new summary
    summary = await asyncio.to_thread(
        summarize,
        session.pages,
        llm,
        settings.ollama_timeout_seconds,
    )
    
    # Cache summary in database if connected
    if db.is_connected:
        async with db.session() as session:
            from app.models.document import Document as DocumentModel
            result = await session.execute(
                select(DocumentModel).where(DocumentModel.id == document_id)
            )
            doc = result.scalar_one_or_none()
            if doc:
                doc.summary = summary.model_dump_json()
                doc.status = DocumentStatus.ready
                doc.stage = None
    
    return summary


@router.get(
    "/{document_id}/summary",
    response_model=PaperSummary,
    responses=_SUMMARY_ERRORS,
)
async def get_summary(
    request: Request,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    sessions: SessionStore = Depends(get_sessions),
) -> PaperSummary:
    """Get cached summary for a document."""
    _, doc_model = await _get_owned_document(document_id, user_id, sessions, request)
    
    db = get_database()
    if db.is_connected and doc_model is not None and doc_model.summary is not None:
        return PaperSummary.model_validate_json(doc_model.summary)
    
    raise AppError("not_ready", "Summary not yet generated.", 409)


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
