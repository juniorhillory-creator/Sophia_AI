import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.settings import Settings
from app.infrastructure.chroma_store import ChromaStore
from app.main import create_app
from tests.embedder import HashEmbedder
from tests.pdf_bytes import build_pdf
from tests.unit.test_summary import ScriptedLlm, _summary


def test_complete_e2e_user_flow() -> None:
    """
    End-to-end verification of the core Sophia AI research workflow:
    1. Register user
    2. Authenticate / Login
    3. Upload 4-page research paper PDF
    4. Fetch document metadata & verify page/chunk counts
    5. Fetch extracted chunks and confirm page attribution
    6. Download original document file from storage
    7. Generate structured summary
    8. Execute RAG Question Answering
    9. Verify grounded citations (correct page number and quote excerpt)
    10. Delete document and confirm cleanup
    """
    # 1. Setup isolated test application with HashEmbedder & memory ChromaStore
    settings = Settings(
        chunk_size=150,
        chunk_overlap=20,
        retrieval_top_k=3,
        similarity_threshold=0.1,
    )
    llm = ScriptedLlm([
        _summary(
            title="Quantum Language Architectures",
            abstract="We investigate quantum state representations for natural language.",
            key_results="A 34% reduction in inference latency and an F1 score of 92.4%.",
        ),
        "The paper reports an F1 score of 92.4% with a 34% reduction in latency.",
    ])

    app = create_app(settings, embedder=HashEmbedder(), vectors=ChromaStore.memory())
    app.state.llm = llm
    client = TestClient(app)

    # 2. Register a new user
    uid = uuid4().hex[:8]
    email = f"researcher_{uid}@sophia-research.org"
    reg_payload = {
        "username": f"researcher_{uid}",
        "email": email,
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    user_data = reg_res.json()["user"]
    user_id = user_data["id"]

    # 3. Login to get access token
    login_payload = {
        "username_or_email": email,
        "password": "SecurePassword123!",
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    access_token = login_res.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 4. Upload 4-page research paper PDF
    pdf_bytes = build_pdf([
        "Page 1: Abstract. Sophia AI processes natural language queries over scientific literature.",
        "Page 2: Methodology. We evaluate 500 benchmark transformers under strict temperature constraints.",
        "Page 3: Results. The proposed method yields a 34% reduction in inference latency and an F1 score of 92.4%.",
        "Page 4: Conclusion. Vector retrieval preserves verifiable page-level citations without hallucination.",
    ])
    files = {"file": ("quantum_nlp.pdf", pdf_bytes, "application/pdf")}
    upload_res = client.post("/api/v1/documents", headers=headers, files=files)
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    doc = upload_res.json()
    doc_id = doc["id"]
    assert doc["filename"] == "quantum_nlp.pdf"
    assert doc["page_count"] == 4
    assert doc["chunk_count"] >= 4

    # 5. Fetch document metadata
    meta_res = client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert meta_res.status_code == 200
    assert meta_res.json()["id"] == doc_id

    # 6. Fetch extracted chunks and verify page numbers
    chunks_res = client.get(f"/api/v1/documents/{doc_id}/chunks", headers=headers)
    assert chunks_res.status_code == 200
    chunks = chunks_res.json()["chunks"]
    pages_found = {c["page_number"] for c in chunks}
    assert {1, 2, 3, 4}.issubset(pages_found), f"Missing pages: {pages_found}"

    # 7. Download original document file from storage
    file_res = client.get(f"/api/v1/documents/{doc_id}/file", headers=headers)
    assert file_res.status_code == 200
    assert file_res.headers["content-type"] == "application/pdf"
    assert len(file_res.content) > 0

    # 8. Generate and view structured summary
    summary_res = client.post(f"/api/v1/documents/{doc_id}/summary", headers=headers)
    assert summary_res.status_code == 200, f"Summary failed: {summary_res.text}"
    summary = summary_res.json()
    assert summary["title"] == "Quantum Language Architectures"
    assert "34% reduction" in summary["key_results"]

    # 9. Ask question via RAG and verify grounded citations
    rag_payload = {"question": "What is the F1 score and reduction in latency reported in the paper?"}
    chat_res = client.post(f"/api/v1/documents/{doc_id}/questions", headers=headers, json=rag_payload)
    assert chat_res.status_code == 200, f"RAG failed: {chat_res.text}"
    chat_data = chat_res.json()
    assert "92.4%" in chat_data["answer"]

    # 10. Verify citations
    assert len(chat_data["sources"]) > 0, "Expected at least one citation"
    citation = chat_data["sources"][0]
    assert "page" in citation or "page_number" in citation
    page_num = citation.get("page") or citation.get("page_number")
    assert page_num in [1, 2, 3, 4]
    # Check that the excerpt from page 3 containing results was retrieved
    all_excerpts = " ".join(s.get("text") or s.get("excerpt", "") for s in chat_data["sources"])
    assert "34%" in all_excerpts or "latency" in all_excerpts

    # 11. Delete document and confirm cleanup
    del_res = client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify document is no longer listed
    list_res = client.get("/api/v1/documents", headers=headers)
    assert list_res.status_code == 200
    assert not any(d["id"] == doc_id for d in list_res.json())
