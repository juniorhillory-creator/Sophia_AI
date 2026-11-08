import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy import select

from app.core.settings import Settings
from app.core.supabase import (
    SupabaseDocumentService,
    SupabaseStorageService,
    get_supabase_client,
)
from app.db.session import get_database
from app.dependencies import (
    get_current_user,
    get_ingestion,
    get_llm,
    get_rag,
    get_sessions,
    get_settings,
)
from app.domain.errors import AppError
from app.models.document import Document as DocumentModel, DocumentStatus as ModelDocumentStatus
from app.schemas.models import (
    ChatResponse,
    ChunkList,
    Document,
    DocumentStatus,
    ErrorBody,
    INSUFFICIENT,
    PaperSummary,
    ProcessingStage,
    QuestionRequest,
)
from app.services.ingestion import IngestionService
from app.services.llm import Llm
from app.services.rag import RagService
from app.services.sessions import DocumentSession, SessionStore
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


def _parse_datetime(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)



@router.post("", response_model=Document, status_code=201, openapi_extra=_UPLOAD_BODY)
async def upload_document(
    request: Request,
    settings: Settings = Depends(get_settings),
    ingestion: IngestionService = Depends(get_ingestion),
    user_id: UUID = Depends(get_current_user),
) -> Document:
    filename, content_type, data = await read_pdf_upload(request, settings.max_upload_bytes)
    document = await ingestion.ingest(filename, content_type, data)
    return Document(
        id=document.id,
        user_id=user_id,
        filename=document.filename,
        page_count=document.page_count,
        chunk_count=document.chunk_count,
        status=DocumentStatus.ready,
        stage=None,
        error_code=None,
        error_message=None,
        created_at=document.created_at,
        updated_at=document.created_at,
    )


@router.get("", response_model=list[Document])
async def list_documents(
    request: Request,
    user_id: UUID = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    limit: int = 50,
    offset: int = 0,
) -> list[Document]:
    """List user's documents with pagination."""
    # 1. Try Supabase
    supabase = get_supabase_client(settings)
    if supabase is not None:
        try:
            doc_svc = SupabaseDocumentService(supabase)
            rows = await doc_svc.list_documents(user_id, limit, offset)
            return [
                Document(
                    id=UUID(r["id"]),
                    user_id=UUID(r["user_id"]),
                    filename=r["filename"],
                    page_count=r.get("page_count", 0),
                    chunk_count=r.get("chunk_count", 0),
                    status=DocumentStatus(r.get("status", "ready")),
                    stage=ProcessingStage(r["stage"]) if r.get("stage") else None,
                    error_code=r.get("error_code"),
                    error_message=r.get("error_message"),
                    created_at=_parse_datetime(r.get("created_at")),
                    updated_at=_parse_datetime(r.get("updated_at")),
                )
                for r in rows
            ]
        except Exception:
            pass

    # 2. Try SQLAlchemy database
    db = get_database()
    if db.is_connected:
        async with db.session() as session:
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
                    status=DocumentStatus(doc.status.value),
                    stage=ProcessingStage(doc.stage.value) if doc.stage is not None else None,
                    error_code=doc.error_code,
                    error_message=doc.error_message,
                    created_at=doc.created_at,
                    updated_at=doc.updated_at,
                )
                for doc in docs
            ]

    # 3. Fallback to in-memory SessionStore (e.g. unit tests)
    sessions = request.app.state.sessions
    docs = []
    for session in sessions._items.values():
        doc = session.document
        if hasattr(doc, "user_id") and doc.user_id == user_id:
            docs.append(doc)
    return docs[offset:offset + limit]


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    request: Request,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    sessions: SessionStore = Depends(get_sessions),
) -> None:
    """Delete a document and all associated data."""
    # Verify ownership
    await _get_owned_document(document_id, user_id, sessions, request)

    # Delete from Supabase if configured
    supabase = get_supabase_client(settings)
    if supabase is not None:
        try:
            doc_svc = SupabaseDocumentService(supabase)
            await doc_svc.delete_document(document_id, user_id)
            storage = SupabaseStorageService(supabase)
            await storage.delete_pdf(user_id, document_id)
        except Exception:
            pass

    # Delete from SQLAlchemy database if connected
    db = get_database()
    if db.is_connected:
        async with db.session() as db_session:
            result = await db_session.execute(
                select(DocumentModel).where(DocumentModel.id == document_id)
            )
            doc_to_delete = result.scalar_one_or_none()
            if doc_to_delete is not None:
                await db_session.delete(doc_to_delete)

    # Delete from ChromaDB
    chroma = request.app.state.rag._store
    chroma.delete_by_document_id(document_id)

    # Delete from filesystem
    data_dir = Path(settings.chroma_path).parent / "documents" / str(document_id)
    if data_dir.exists():
        import shutil
        shutil.rmtree(data_dir, ignore_errors=True)

    # Delete from SessionStore
    sessions.delete(document_id)


async def _get_owned_document(
    document_id: UUID,
    user_id: UUID,
    sessions: SessionStore,
    request: Request,
) -> tuple:
    """Get document from SessionStore or Supabase/Database and verify ownership."""
    session = sessions.get(document_id)

    cache_key = f"_owned_docs_{document_id}"
    cached = getattr(request.state, cache_key, None)
    if cached is not None:
        if not cached:
            raise AppError("not_found", "Document not found.", 404)
        return session, cached

    settings = request.app.state.settings
    supabase = get_supabase_client(settings)

    # 1. Supabase check
    if supabase is not None:
        try:
            doc_svc = SupabaseDocumentService(supabase)
            row = await doc_svc.get_document(document_id, user_id)
            if row is not None:
                if session is None:
                    doc = Document(
                        id=UUID(row["id"]),
                        user_id=UUID(row["user_id"]),
                        filename=row["filename"],
                        page_count=row.get("page_count", 0),
                        chunk_count=row.get("chunk_count", 0),
                        status=DocumentStatus(row.get("status", "ready")),
                        created_at=_parse_datetime(row.get("created_at")),
                        updated_at=_parse_datetime(row.get("updated_at")),
                    )
                    session = DocumentSession(document=doc, chunks=[], pages=[])
                    sessions.put(session)
                setattr(request.state, cache_key, row)
                return session, row
        except Exception:
            pass

    # 2. Database check
    db = get_database()
    if db.is_connected:
        async with db.session() as db_session:
            result = await db_session.execute(
                select(DocumentModel).where(DocumentModel.id == document_id)
            )
            doc_model = result.scalar_one_or_none()
            if doc_model is None or doc_model.user_id != user_id:
                raise AppError("not_found", "Document not found.", 404)
        setattr(request.state, cache_key, doc_model)
        return session, doc_model

    if session is None:
        raise AppError("not_found", "Document not found.", 404)

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


_SUMMARY_ERRORS: dict[int | str, dict[str, Any]] = {
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

    # 1. Supabase cache check
    supabase = get_supabase_client(settings)
    if supabase is not None:
        try:
            doc_svc = SupabaseDocumentService(supabase)
            summary_row = await doc_svc.get_summary(document_id, user_id)
            if summary_row and summary_row.get("raw_summary"):
                return PaperSummary.model_validate(summary_row["raw_summary"])
        except Exception:
            pass

    # 2. Database cache check
    db = get_database()
    if db.is_connected and doc_model is not None and getattr(doc_model, "summary", None) is not None:
        return PaperSummary.model_validate_json(doc_model.summary)

    # 3. Generate summary via LLM
    summary = await asyncio.to_thread(
        summarize,
        session.pages,
        llm,
        settings.ollama_timeout_seconds,
    )

    # 4. Save to Supabase
    if supabase is not None:
        try:
            doc_svc = SupabaseDocumentService(supabase)
            await doc_svc.save_summary(document_id, user_id, summary.model_dump())
        except Exception:
            pass

    # 5. Save to Database if connected
    if db.is_connected:
        async with db.session() as db_session:
            result = await db_session.execute(
                select(DocumentModel).where(DocumentModel.id == document_id)
            )
            doc = result.scalar_one_or_none()
            if doc:
                doc.summary = summary.model_dump_json()
                doc.status = ModelDocumentStatus.ready
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
    settings: Settings = Depends(get_settings),
    sessions: SessionStore = Depends(get_sessions),
) -> PaperSummary:
    """Get cached summary for a document."""
    _, doc_model = await _get_owned_document(document_id, user_id, sessions, request)

    # 1. Supabase check
    supabase = get_supabase_client(settings)
    if supabase is not None:
        try:
            doc_svc = SupabaseDocumentService(supabase)
            summary_row = await doc_svc.get_summary(document_id, user_id)
            if summary_row and summary_row.get("raw_summary"):
                return PaperSummary.model_validate(summary_row["raw_summary"])
        except Exception:
            pass

    # 2. Database check
    db = get_database()
    if db.is_connected and doc_model is not None and getattr(doc_model, "summary", None) is not None:
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
    return rag.answer_with_citations(
        document_id, body.question, llm, settings.ollama_timeout_seconds
    )


@router.get(
    "/{document_id}/questions/stream",
    responses={404: {"model": ErrorBody}, 502: {"model": ErrorBody}},
)
async def ask_question_stream(
    request: Request,
    document_id: UUID,
    question: str,
    user_id: UUID = Depends(get_current_user),
    sessions: SessionStore = Depends(get_sessions),
    rag: RagService = Depends(get_rag),
    llm: Llm = Depends(get_llm),
    settings: Settings = Depends(get_settings),
):
    """Stream answer chunks via Server-Sent Events."""
    session, _ = await _get_owned_document(document_id, user_id, sessions, request)

    async def event_generator():
        hits = rag.retrieve(document_id, question)
        if not hits:
            yield f"data: {INSUFFICIENT}\n\n"
            return

        async for chunk in rag.answer_stream(document_id, question, llm, settings.ollama_timeout_seconds):
            yield f"data: {chunk}\n\n"

        citations = []
        for hit in hits:
            snippet = hit.text[:240].strip()
            if snippet:
                citations.append({
                    "page": hit.page,
                    "excerpt": snippet[:240],
                    "chunk_id": hit.chunk_id,
                })
        if citations:
            yield f"data: [CITATIONS]{json.dumps(citations)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{document_id}/file")
async def get_document_file(
    request: Request,
    document_id: UUID,
    user_id: UUID = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    sessions: SessionStore = Depends(get_sessions),
):
    """Serve the original PDF file for the viewer from Supabase Storage or filesystem."""
    session, _ = await _get_owned_document(document_id, user_id, sessions, request)
    filename = session.document.filename if session else "document.pdf"

    # 1. Try Supabase Storage
    supabase = get_supabase_client(settings)
    if supabase is not None:
        try:
            storage = SupabaseStorageService(supabase)
            pdf_bytes = await storage.download_pdf(user_id, document_id)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'inline; filename="{filename}"'},
            )
        except Exception:
            pass

    # 2. Local filesystem fallback
    data_dir = Path(settings.chroma_path).parent / "documents" / str(document_id)
    pdf_path = data_dir / "original.pdf"

    if not pdf_path.exists():
        raise AppError("not_found", "Document file not found.", 404)

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
    )
