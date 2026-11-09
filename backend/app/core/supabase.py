import logging
from typing import Any, cast
from uuid import UUID

from supabase import Client, create_client

from app.core.settings import Settings

logger = logging.getLogger("sophia.supabase")

_client_cache: Client | None = None


def is_supabase_configured(settings: Settings) -> bool:
    """Return True if Supabase URL and credentials are configured."""
    url = (settings.supabase_url or "").strip()
    key = (settings.supabase_secret_key or settings.supabase_publishable_key or "").strip()
    return bool(url and key and url.startswith(("http://", "https://")))


def get_supabase_client(settings: Settings) -> Client | None:
    """Get or create cached Supabase Client. Returns None if unconfigured."""
    global _client_cache
    if _client_cache is not None:
        return _client_cache

    if not is_supabase_configured(settings):
        return None

    url = settings.supabase_url.strip()
    key = (settings.supabase_secret_key or settings.supabase_publishable_key).strip()

    try:
        _client_cache = create_client(url, key)
        logger.info("Supabase client initialized successfully")
        return _client_cache
    except Exception as e:
        logger.error("Failed to initialize Supabase client: %s", e)
        return None


def reset_supabase_client() -> None:
    """Clear cached client (useful for tests)."""
    global _client_cache
    _client_cache = None


class SupabaseStorageService:
    """Handles PDF operations in the research-papers bucket."""

    BUCKET_NAME = "research-papers"

    def __init__(self, client: Client) -> None:
        self._client = client

    def get_path(self, user_id: UUID, document_id: UUID) -> str:
        return f"{user_id}/{document_id}/original.pdf"

    async def upload_pdf(self, user_id: UUID, document_id: UUID, data: bytes) -> str:
        path = self.get_path(user_id, document_id)
        # Using storage3 upload API
        self._client.storage.from_(self.BUCKET_NAME).upload(
            path=path,
            file=data,
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )
        return path

    async def download_pdf(self, user_id: UUID, document_id: UUID) -> bytes:
        path = self.get_path(user_id, document_id)
        return self._client.storage.from_(self.BUCKET_NAME).download(path)

    async def delete_pdf(self, user_id: UUID, document_id: UUID) -> None:
        path = self.get_path(user_id, document_id)
        self._client.storage.from_(self.BUCKET_NAME).remove([path])


class SupabaseDocumentService:
    """Handles CRUD operations for documents, summaries, and manuscripts."""

    def __init__(self, client: Client) -> None:
        self._client = client

    async def create_document(
        self,
        document_id: UUID,
        user_id: UUID,
        filename: str,
        page_count: int,
        chunk_count: int,
        storage_path: str,
        file_size: int = 0,
    ) -> dict[str, Any]:
        payload = {
            "id": str(document_id),
            "user_id": str(user_id),
            "filename": filename,
            "original_filename": filename,
            "storage_path": storage_path,
            "file_size": file_size,
            "mime_type": "application/pdf",
            "page_count": page_count,
            "chunk_count": chunk_count,
            "status": "ready",
            "stage": None,
        }
        res = self._client.table("documents").insert(payload).execute()
        return cast(dict[str, Any], res.data[0]) if res.data else payload

    async def list_documents(self, user_id: UUID, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
        res = (
            self._client.table("documents")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return cast(list[dict[str, Any]], res.data or [])

    async def get_document(self, document_id: UUID, user_id: UUID) -> dict[str, Any] | None:
        res = (
            self._client.table("documents")
            .select("*")
            .eq("id", str(document_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return cast(dict[str, Any], res.data[0]) if res.data else None

    async def delete_document(self, document_id: UUID, user_id: UUID) -> None:
        self._client.table("documents").delete().eq("id", str(document_id)).eq("user_id", str(user_id)).execute()

    async def save_summary(
        self,
        document_id: UUID,
        user_id: UUID,
        summary_data: dict[str, Any],
    ) -> dict[str, Any]:
        payload = {
            "document_id": str(document_id),
            "user_id": str(user_id),
            "title": summary_data.get("title"),
            "authors": summary_data.get("authors"),
            "abstract": summary_data.get("abstract"),
            "problem_statement": summary_data.get("problem_statement"),
            "methodology": summary_data.get("methodology"),
            "key_results": summary_data.get("key_results"),
            "conclusion": summary_data.get("conclusion"),
            "raw_summary": summary_data,
        }
        res = self._client.table("summaries").upsert(payload, on_conflict="document_id").execute()
        return cast(dict[str, Any], res.data[0]) if res.data else payload

    async def get_summary(self, document_id: UUID, user_id: UUID) -> dict[str, Any] | None:
        res = (
            self._client.table("summaries")
            .select("*")
            .eq("document_id", str(document_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return cast(dict[str, Any], res.data[0]) if res.data else None


class SupabaseManuscriptService:
    """Handles CRUD operations for manuscripts in Supabase."""

    def __init__(self, client: Client) -> None:
        self._client = client

    async def list_manuscripts(self, user_id: UUID) -> list[dict[str, Any]]:
        res = (
            self._client.table("manuscripts")
            .select("*")
            .eq("user_id", str(user_id))
            .order("updated_at", desc=True)
            .execute()
        )
        return cast(list[dict[str, Any]], res.data or [])

    async def get_manuscript(self, manuscript_id: UUID, user_id: UUID) -> dict[str, Any] | None:
        res = (
            self._client.table("manuscripts")
            .select("*")
            .eq("id", str(manuscript_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return cast(dict[str, Any], res.data[0]) if res.data else None

    async def create_manuscript(self, user_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "user_id": str(user_id),
            "title": data.get("title", "Untitled Manuscript"),
            "content": data.get("content", ""),
            "status": data.get("status", "draft"),
            "document_id": str(data["document_id"]) if data.get("document_id") else None,
        }
        res = self._client.table("manuscripts").insert(payload).execute()
        return cast(dict[str, Any], res.data[0]) if res.data else payload

    async def update_manuscript(
        self, manuscript_id: UUID, user_id: UUID, data: dict[str, Any]
    ) -> dict[str, Any] | None:
        payload = {k: v for k, v in data.items() if v is not None}
        if "document_id" in payload and payload["document_id"] is not None:
            payload["document_id"] = str(payload["document_id"])
        if not payload:
            return await self.get_manuscript(manuscript_id, user_id)
        res = (
            self._client.table("manuscripts")
            .update(payload)
            .eq("id", str(manuscript_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return cast(dict[str, Any], res.data[0]) if res.data else None

    async def delete_manuscript(self, manuscript_id: UUID, user_id: UUID) -> bool:
        res = (
            self._client.table("manuscripts")
            .delete()
            .eq("id", str(manuscript_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return bool(res.data)


