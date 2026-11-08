from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.domain.errors import AppError
from app.infrastructure.chroma_store import ChromaStore
from app.main import create_app
from app.schemas.models import INSUFFICIENT
from tests.embedder import HashEmbedder
from tests.pdf_bytes import build_pdf
from tests.unit.test_summary import ScriptedLlm, _summary


def _app(settings: Settings | None = None):
    resolved = settings or Settings()
    return create_app(resolved, embedder=HashEmbedder(), vectors=ChromaStore.memory())


def test_health() -> None:
    client = TestClient(_app())
    for path in ("/health", "/api/v1/health"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_upload_returns_metadata_and_page_chunks(auth_client: TestClient) -> None:
    client = auth_client
    pdf = build_pdf(["Page one finding", "Page two finding"])
    response = client.post(
        "/api/v1/documents",
        files={"file": ("study.pdf", pdf, "application/pdf")},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["filename"] == "study.pdf"
    assert body["page_count"] == 2
    assert body["chunk_count"] >= 2
    assert "Page one finding" not in response.text

    chunks = client.get(f"/api/v1/documents/{body['id']}/chunks")
    assert chunks.status_code == 200
    stored = chunks.json()["chunks"]
    assert {chunk["page_number"] for chunk in stored} == {1, 2}
    assert any("Page one finding" in chunk["text"] and chunk["page_number"] == 1 for chunk in stored)
    assert any("Page two finding" in chunk["text"] and chunk["page_number"] == 2 for chunk in stored)


def test_sessions_are_isolated_over_http(auth_client: TestClient) -> None:
    client = auth_client
    first = client.post(
        "/api/v1/documents",
        files={"file": ("a.pdf", build_pdf(["ALPHA-HTTP-TOKEN"]), "application/pdf")},
    )
    second = client.post(
        "/api/v1/documents",
        files={"file": ("b.pdf", build_pdf(["BETA-HTTP-TOKEN"]), "application/pdf")},
    )
    assert first.status_code == 201 and second.status_code == 201
    first_chunks = client.get(f"/api/v1/documents/{first.json()['id']}/chunks").text
    second_chunks = client.get(f"/api/v1/documents/{second.json()['id']}/chunks").text
    assert "ALPHA-HTTP-TOKEN" in first_chunks
    assert "BETA-HTTP-TOKEN" not in first_chunks
    assert "BETA-HTTP-TOKEN" in second_chunks
    assert "ALPHA-HTTP-TOKEN" not in second_chunks


def test_unknown_document_is_not_found(auth_client: TestClient) -> None:
    client = auth_client
    response = client.get(f"/api/v1/documents/{uuid4()}")
    assert response.status_code == 404
    assert response.json() == {"code": "not_found", "message": "Document not found."}


def test_rejects_bad_extension_mime_empty_and_oversize(auth_client: TestClient) -> None:
    client = auth_client
    pdf = build_pdf(["A short finding"])

    extension = client.post(
        "/api/v1/documents",
        files={"file": ("notes.txt", pdf, "application/pdf")},
    )
    mime = client.post(
        "/api/v1/documents",
        files={"file": ("notes.pdf", pdf, "text/plain")},
    )
    empty = client.post(
        "/api/v1/documents",
        files={"file": ("blank.pdf", build_pdf([""]), "application/pdf")},
    )
    
    # Create separate clients for different max_upload_bytes settings
    oversize_app = _app(Settings(max_upload_bytes=32, chunk_size=200, chunk_overlap=20))
    # Override auth for test
    from app.dependencies import get_current_user
    from tests.conftest import DEFAULT_TEST_USER_ID
    oversize_app.dependency_overrides[get_current_user] = lambda: DEFAULT_TEST_USER_ID
    oversize_client = TestClient(oversize_app)
    oversize = oversize_client.post(
        "/api/v1/documents",
        files={"file": ("big.pdf", b"%PDF" + (b"x" * 64), "application/pdf")},
    )
    
    missing = client.post("/api/v1/documents")
    
    huge_app = _app(Settings(max_upload_bytes=32, chunk_size=200, chunk_overlap=20))
    huge_app.dependency_overrides[get_current_user] = lambda: DEFAULT_TEST_USER_ID
    huge_client = TestClient(huge_app)
    huge = huge_client.post(
        "/api/v1/documents",
        content=b"x" * (32 + 64 * 1024 + 1),
        headers={"content-type": "multipart/form-data; boundary=abc"},
    )

    assert extension.status_code == 400
    assert mime.status_code == 400
    assert empty.status_code == 400
    assert empty.json()["code"] == "empty_document"
    assert oversize.status_code == 413
    assert oversize.json()["code"] == "payload_too_large"
    assert huge.status_code == 413
    assert missing.status_code == 422
    assert missing.json()["code"] == "validation_error"
    for response in (extension, mime, empty, oversize, huge, missing):
        assert set(response.json()) == {"code", "message"}
        assert "Traceback" not in response.text


def test_summary_endpoint_returns_the_schema(auth_client: TestClient) -> None:
    client = auth_client
    llm = ScriptedLlm([_summary(title="From paper")])
    client.app.state.llm = llm
    uploaded = client.post(
        "/api/v1/documents",
        files={"file": ("study.pdf", build_pdf(["UNIQUE-PAPER-SENTENCE"]), "application/pdf")},
    )
    assert uploaded.status_code == 201
    response = client.post(f"/api/v1/documents/{uploaded.json()['id']}/summary")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "title",
        "authors",
        "abstract",
        "problem_statement",
        "methodology",
        "key_results",
        "conclusion",
    }
    assert body["title"] == "From paper"
    assert "UNIQUE-PAPER-SENTENCE" in llm.calls[0]["messages"][1]["content"]
    assert "Traceback" not in response.text


def test_summary_errors_for_missing_document_and_model_failure(auth_client: TestClient) -> None:
    client = auth_client
    client.app.state.llm = ScriptedLlm(
        [AppError("model_timeout", "The local model timed out.", 504)]
    )
    missing = client.post(f"/api/v1/documents/{uuid4()}/summary")
    assert missing.status_code == 404
    assert missing.json()["code"] == "not_found"

    uploaded = client.post(
        "/api/v1/documents",
        files={"file": ("study.pdf", build_pdf(["A finding"]), "application/pdf")},
    )
    failed = client.post(f"/api/v1/documents/{uploaded.json()['id']}/summary")
    assert failed.status_code == 504
    assert failed.json() == {"code": "model_timeout", "message": "The local model timed out."}
    assert "Traceback" not in failed.text


def test_question_cites_the_stored_page(auth_client: TestClient) -> None:
    client = auth_client
    client.app.state.llm = ScriptedLlm(["The yield rose. See page 99."])
    missing = client.post(
        f"/api/v1/documents/{uuid4()}/questions",
        json={"question": "What changed?"},
    )
    assert missing.status_code == 404

    uploaded = client.post(
        "/api/v1/documents",
        files={"file": ("study.pdf", build_pdf(["The catalyst increased yield"]), "application/pdf")},
    )
    assert uploaded.status_code == 201
    document_id = uploaded.json()["id"]
    response = client.post(
        f"/api/v1/documents/{document_id}/questions",
        json={"question": "catalyst increased yield"},
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"answer", "sources", "document_id"}
    assert body["document_id"] == document_id
    assert body["answer"] == "The yield rose. See page 99."
    assert body["sources"][0]["page"] == 1
    assert "catalyst" in body["sources"][0]["excerpt"]
    assert body["sources"][0]["chunk_id"]
    assert "Traceback" not in response.text

    client.app.state.llm = ScriptedLlm([INSUFFICIENT])
    empty = client.post(
        f"/api/v1/documents/{document_id}/questions",
        json={"question": "catalyst increased yield"},
    )
    assert empty.json()["answer"] == INSUFFICIENT
    assert empty.json()["sources"] == []