import logging
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import PurePath
from uuid import UUID, uuid4

from app.core.settings import Settings
from app.db.session import get_database
from app.domain.errors import AppError
from app.infrastructure.chunking import chunk_pages
from app.infrastructure.pdf import extract_pages
from app.models.document import Document as DocumentModel
from app.schemas.models import Chunk, Document, DocumentStatus
from app.services.sessions import DocumentSession, SessionStore

logger = logging.getLogger("sophia.ingestion")


def validate_declared_file(filename: str | None, content_type: str | None) -> str:
    if not filename or not filename.strip():
        raise AppError("invalid_pdf", "Upload a PDF file.", 400)
    name = PurePath(filename.replace("\\", "/")).name
    name = "".join(char for char in name if char.isprintable()).strip()
    if not name or len(name) > 255:
        raise AppError("invalid_pdf", "Upload a PDF file.", 400)
    if PurePath(name).suffix.lower() != ".pdf":
        raise AppError("invalid_pdf", "File must use a .pdf extension.", 400)
    media_type = (content_type or "").split(";", 1)[0].strip().lower()
    if media_type != "application/pdf":
        raise AppError("invalid_pdf", "Content type must be application/pdf.", 400)
    return name


class IngestionService:
    def __init__(
        self,
        settings: Settings,
        sessions: SessionStore,
        index_chunks: Callable[[list[Chunk]], None] | None = None,
        user_id: UUID | None = None,
    ) -> None:
        self._settings = settings
        self._sessions = sessions
        self._index_chunks = index_chunks
        self._user_id = user_id

    async def ingest(self, filename: str | None, content_type: str | None, data: bytes) -> Document:
        safe_name = validate_declared_file(filename, content_type)
        pages = extract_pages(data)
        document_id = uuid4()
        chunks = chunk_pages(
            document_id,
            pages,
            self._settings.chunk_size,
            self._settings.chunk_overlap,
        )
        if not chunks:
            raise AppError(
                "empty_document",
                "This PDF has no extractable text. Scanned pages are not supported.",
                400,
            )
        
        now = datetime.now(timezone.utc)
        
        # Create document in PostgreSQL if user_id is provided and database is connected
        if self._user_id is not None:
            db = get_database()
            if db.is_connected:
                try:
                    async with db.session() as session:
                        doc_model = DocumentModel(
                            id=document_id,
                            user_id=self._user_id,
                            filename=safe_name,
                            page_count=len(pages),
                            chunk_count=len(chunks),
                        )
                        session.add(doc_model)
                except Exception as e:
                    logger.error("document_creation_failed", extra={"error": str(e)})
                    raise AppError("storage_error", "Failed to persist document metadata", 500)
            else:
                logger.warning("database_not_connected_skipping_document_creation")
        
        document = Document(
            id=document_id,
            user_id=self._user_id or UUID(int=0),  # Default for tests without auth
            filename=safe_name,
            page_count=len(pages),
            chunk_count=len(chunks),
            status=DocumentStatus.processing,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        # shortcut: index during upload; move off the request if large papers time out
        if self._index_chunks is not None:
            self._index_chunks(chunks)
        self._sessions.put(DocumentSession(document=document, chunks=chunks, pages=pages))
        logger.info(
            "document_stored",
            extra={
                "document_id": str(document.id),
                "page_count": document.page_count,
                "chunk_count": document.chunk_count,
            },
        )
        return document
