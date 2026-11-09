from uuid import UUID, uuid4
from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.infrastructure.chroma_store import ChromaStore
from app.main import create_app
from tests.embedder import HashEmbedder

TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


class MockManuscriptService:
    def __init__(self) -> None:
        self.store: dict[UUID, dict] = {}

    async def list_manuscripts(self, user_id: UUID) -> list[dict]:
        return [m for m in self.store.values() if m["user_id"] == str(user_id)]

    async def get_manuscript(self, manuscript_id: UUID, user_id: UUID) -> dict | None:
        m = self.store.get(manuscript_id)
        if m and m["user_id"] == str(user_id):
            return m
        return None

    async def create_manuscript(self, user_id: UUID, data: dict) -> dict:
        m_id = uuid4()
        now = "2026-11-09T12:00:00+00:00"
        item = {
            "id": str(m_id),
            "user_id": str(user_id),
            "document_id": str(data["document_id"]) if data.get("document_id") else None,
            "title": data.get("title", "Untitled Manuscript"),
            "content": data.get("content", ""),
            "status": data.get("status", "draft"),
            "version": 1,
            "created_at": now,
            "updated_at": now,
        }
        self.store[m_id] = item
        return item

    async def update_manuscript(self, manuscript_id: UUID, user_id: UUID, data: dict) -> dict | None:
        m = self.store.get(manuscript_id)
        if not m or m["user_id"] != str(user_id):
            return None
        m.update(data)
        m["updated_at"] = "2026-11-09T12:05:00+00:00"
        return m

    async def delete_manuscript(self, manuscript_id: UUID, user_id: UUID) -> bool:
        m = self.store.get(manuscript_id)
        if not m or m["user_id"] != str(user_id):
            return False
        del self.store[manuscript_id]
        return True


def test_manuscript_crud_lifecycle() -> None:
    settings = Settings(supabase_url="", supabase_publishable_key="", supabase_secret_key="")
    app = create_app(settings, embedder=HashEmbedder(), vectors=ChromaStore.memory())

    from app.dependencies import get_current_user
    from app.api.manuscripts import _get_service

    mock_service = MockManuscriptService()
    app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
    app.dependency_overrides[_get_service] = lambda: mock_service

    client = TestClient(app)

    # 1. Initially empty
    list_res = client.get("/api/v1/manuscripts")
    assert list_res.status_code == 200
    assert list_res.json() == []

    # 2. Create manuscript
    create_payload = {
        "title": "Quantum Synthesis",
        "content": "# Introduction\nExploring quantum states.",
    }
    create_res = client.post("/api/v1/manuscripts", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["title"] == "Quantum Synthesis"
    assert "Exploring quantum states" in created["content"]
    m_id = created["id"]

    # 3. Retrieve single manuscript
    get_res = client.get(f"/api/v1/manuscripts/{m_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == m_id

    # 4. Update manuscript
    update_payload = {
        "title": "Quantum Synthesis v2",
        "content": "# Introduction\nUpdated findings.",
    }
    update_res = client.put(f"/api/v1/manuscripts/{m_id}", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["title"] == "Quantum Synthesis v2"
    assert "Updated findings" in updated["content"]

    # 5. Delete manuscript
    del_res = client.delete(f"/api/v1/manuscripts/{m_id}")
    assert del_res.status_code == 204

    # 6. Verify deleted
    get_after_del = client.get(f"/api/v1/manuscripts/{m_id}")
    assert get_after_del.status_code == 404

