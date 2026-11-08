import asyncio
import pytest
from uuid import UUID

from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.infrastructure.chroma_store import ChromaStore
from app.main import create_app
from tests.embedder import HashEmbedder


# Test user ID for authentication
TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def auth_client() -> TestClient:
    """Create an authenticated test client with mocked get_current_user."""
    settings = Settings(chunk_size=200, chunk_overlap=20)
    app = create_app(settings, embedder=HashEmbedder(), vectors=ChromaStore.memory())
    
    # Override get_current_user to return test user without database
    from app.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
    
    client = TestClient(app)
    return client