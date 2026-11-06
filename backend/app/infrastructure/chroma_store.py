from dataclasses import dataclass
from threading import Lock
from uuid import UUID

from app.schemas.models import Chunk

_COLLECTION = "sophia_chunks"


@dataclass(frozen=True)
class Hit:
    chunk_id: str
    page: int
    text: str
    score: float


class ChromaStore:
    """One collection. document_id metadata keeps papers apart."""

    def __init__(self, client: object) -> None:
        self._collection = client.get_or_create_collection(
            name=_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
        self._lock = Lock()

    @staticmethod
    def open(path: str) -> "ChromaStore":
        import chromadb

        return ChromaStore(chromadb.PersistentClient(path=path))

    @staticmethod
    def memory() -> "ChromaStore":
        import chromadb

        return ChromaStore(chromadb.EphemeralClient())

    def upsert(self, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
        if not chunks:
            return
        with self._lock:
            self._collection.upsert(
                ids=[chunk.chunk_id for chunk in chunks],
                embeddings=embeddings,
                documents=[chunk.text for chunk in chunks],
                metadatas=[
                    {
                        "document_id": str(chunk.document_id),
                        "page": chunk.page_number,
                        "chunk_id": chunk.chunk_id,
                    }
                    for chunk in chunks
                ],
            )

    def query(
        self,
        document_id: UUID,
        embedding: list[float],
        top_k: int,
        min_score: float,
    ) -> list[Hit]:
        with self._lock:
            total = self._collection.count()
            if total == 0:
                return []
            result = self._collection.query(
                query_embeddings=[embedding],
                n_results=min(top_k, total),
                where={"document_id": str(document_id)},
                include=["documents", "metadatas", "distances"],
            )
        return _hits(result, min_score)


def _hits(result: dict, min_score: float) -> list[Hit]:
    ids = (result.get("ids") or [[]])[0] or []
    documents = (result.get("documents") or [[]])[0] or []
    metadatas = (result.get("metadatas") or [[]])[0] or []
    distances = (result.get("distances") or [[]])[0] or []
    hits: list[Hit] = []
    for chunk_id, text, meta, distance in zip(ids, documents, metadatas, distances, strict=False):
        parsed = _stored(meta, chunk_id)
        if parsed is None or not text or distance is None:
            continue
        stored_id, page = parsed
        score = 1.0 - float(distance)
        if score < min_score:
            continue
        hits.append(Hit(chunk_id=stored_id, page=page, text=str(text), score=score))
    return hits


def _stored(meta: object, chunk_id: object) -> tuple[str, int] | None:
    if not isinstance(meta, dict) or not isinstance(chunk_id, str) or not chunk_id:
        return None
    stored_id = meta.get("chunk_id")
    value = meta.get("page")
    if stored_id != chunk_id or isinstance(value, bool):
        return None
    try:
        page = int(value)
    except (TypeError, ValueError):
        return None
    if page < 1 or page != value:
        return None
    return chunk_id, page
