import asyncio
import pytest
from uuid import UUID

from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.infrastructure.chroma_store import ChromaStore
from app.main import create_app
from tests.embedder import HashEmbedder


# Default test user ID - used for authenticated test clients
DEFAULT_TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def auth_client() -> TestClient:
    """Create an authenticated test client with mocked get_current_user."""
<<<<<<< HEAD
    settings = Settings(
        chunk_size=200,
        chunk_overlap=20,
        supabase_url="",
        supabase_publishable_key="",
        supabase_secret_key="",
    )
=======
    settings = Settings(chunk_size=200, chunk_overlap=20)
>>>>>>> 0fca1bbaffa87e45686a97d043d28b7a2e96ae81
    app = create_app(settings, embedder=HashEmbedder(), vectors=ChromaStore.memory())
    
    # Override get_current_user to return test user without database
    from app.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: DEFAULT_TEST_USER_ID
    
    client = TestClient(app)
    return client