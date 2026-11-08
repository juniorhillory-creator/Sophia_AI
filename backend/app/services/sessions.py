from dataclasses import dataclass
from threading import Lock
from uuid import UUID

from app.infrastructure.pdf import PageText
from app.schemas.models import Chunk, Document


@dataclass
class DocumentSession:
    document: Document
    chunks: list[Chunk]
    pages: list[PageText]


class SessionStore:
    """In-memory sessions. Ids are unguessable; reads never cross ids."""

    # shortcut: sessions last until process exit, add a TTL if uploads are unbounded.

    def __init__(self) -> None:
        self._items: dict[UUID, DocumentSession] = {}
        self._lock = Lock()

    def put(self, session: DocumentSession) -> None:
        with self._lock:
            self._items[session.document.id] = session

    def get(self, document_id: UUID) -> DocumentSession | None:
        with self._lock:
            session = self._items.get(document_id)
            if session is None:
                return None
            return DocumentSession(
                document=session.document.model_copy(deep=True),
                chunks=[chunk.model_copy(deep=True) for chunk in session.chunks],
                pages=list(session.pages),
            )

    def delete(self, document_id: UUID) -> None:
        with self._lock:
            self._items.pop(document_id, None)
