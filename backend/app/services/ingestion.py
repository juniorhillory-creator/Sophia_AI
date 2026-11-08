import logging
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path, PurePath
from uuid import UUID, uuid4

from app.core.settings import Settings
<<<<<<< HEAD
from app.core.supabase import (
    SupabaseDocumentService,
    SupabaseStorageService,
    get_supabase_client,
)
=======
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
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
<<<<<<< HEAD

        now = datetime.now(timezone.utc)
        storage_path = f"{self._user_id or 'anonymous'}/{document_id}/original.pdf"

        # 1. Supabase Storage & Database integration
        supabase = get_supabase_client(self._settings)
        if supabase is not None and self._user_id is not None:
            try:
                storage = SupabaseStorageService(supabase)
                storage_path = await storage.upload_pdf(self._user_id, document_id, data)
            except Exception as e:
                logger.warning("failed_to_save_pdf_to_supabase_storage", extra={"error": str(e)})

            try:
                doc_svc = SupabaseDocumentService(supabase)
                await doc_svc.create_document(
                    document_id=document_id,
                    user_id=self._user_id,
                    filename=safe_name,
                    page_count=len(pages),
                    chunk_count=len(chunks),
                    storage_path=storage_path,
                    file_size=len(data),
                )
            except Exception as e:
                logger.error("supabase_document_creation_failed", extra={"error": str(e)})
                raise AppError("storage_error", "Failed to persist document metadata in Supabase", 500)
        elif self._user_id is not None:
            # Fallback: Create document in PostgreSQL if connected
=======
        
        now = datetime.now(timezone.utc)

        # Persist PDF file to disk for viewing
        try:
            data_dir = Path(self._settings.chroma_path).parent / "documents" / str(document_id)
            data_dir.mkdir(parents=True, exist_ok=True)
            pdf_path = data_dir / "original.pdf"
            pdf_path.write_bytes(data)
        except Exception as e:
            logger.warning("failed_to_save_pdf_file", extra={"error": str(e)})
        
        # Create document in PostgreSQL if user_id is provided and database is connected
        if self._user_id is not None:
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
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
<<<<<<< HEAD

        # 2. Local filesystem cache for fast retrieval / offline fallback
        try:
            data_dir = Path(self._settings.chroma_path).parent / "documents" / str(document_id)
            data_dir.mkdir(parents=True, exist_ok=True)
            pdf_path = data_dir / "original.pdf"
            pdf_path.write_bytes(data)
        except Exception as e:
            logger.warning("failed_to_save_pdf_file", extra={"error": str(e)})

        document = Document(
            id=document_id,
            user_id=self._user_id or UUID(int=0),
=======
            else:
                logger.warning("database_not_connected_skipping_document_creation")
        
        document = Document(
            id=document_id,
            user_id=self._user_id or UUID(int=0),  # Default for tests without auth
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
            filename=safe_name,
            page_count=len(pages),
            chunk_count=len(chunks),
            status=DocumentStatus.ready,
<<<<<<< HEAD
            created_at=now,
            updated_at=now,
        )

        # 3. Vector indexing & SessionStore cache
=======
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        # shortcut: index during upload; move off the request if large papers time out
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
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
