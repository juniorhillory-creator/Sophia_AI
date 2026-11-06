from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.main import create_app
from tests.pdf_bytes import build_pdf


def _client(max_upload_bytes: int = 20 * 1024 * 1024) -> TestClient:
    settings = Settings(max_upload_bytes=max_upload_bytes, chunk_size=200, chunk_overlap=20)
    return TestClient(create_app(settings))


def test_health() -> None:
    client = _client()
    for path in ("/health", "/api/v1/health"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_upload_returns_metadata_and_page_chunks() -> None:
    client = _client()
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


def test_sessions_are_isolated_over_http() -> None:
    client = _client()
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


def test_unknown_document_is_not_found() -> None:
    response = _client().get(f"/api/v1/documents/{uuid4()}")
    assert response.status_code == 404
    assert response.json() == {"code": "not_found", "message": "Document not found."}


def test_rejects_bad_extension_mime_empty_and_oversize() -> None:
    client = _client()
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
    oversize = _client(max_upload_bytes=32).post(
        "/api/v1/documents",
        files={"file": ("big.pdf", b"%PDF" + (b"x" * 64), "application/pdf")},
    )
    missing = client.post("/api/v1/documents")
    huge = _client(max_upload_bytes=32).post(
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
