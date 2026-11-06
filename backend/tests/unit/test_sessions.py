import logging

from app.core.log_config import JsonFormatter, configure_logging
from app.core.settings import Settings
from app.services.ingestion import IngestionService
from app.services.sessions import SessionStore
from tests.pdf_bytes import build_pdf


def _service() -> tuple[IngestionService, SessionStore]:
    store = SessionStore()
    settings = Settings(chunk_size=1200, chunk_overlap=150)
    return IngestionService(settings, store), store


def test_sessions_do_not_share_document_text() -> None:
    service, store = _service()
    first = service.ingest("alpha.pdf", "application/pdf", build_pdf(["ALPHA-ONLY-TOKEN"]))
    second = service.ingest("beta.pdf", "application/pdf", build_pdf(["BETA-ONLY-TOKEN"]))

    first_session = store.get(first.id)
    second_session = store.get(second.id)
    assert first_session is not None and second_session is not None
    first_text = " ".join(chunk.text for chunk in first_session.chunks)
    second_text = " ".join(chunk.text for chunk in second_session.chunks)
    assert "ALPHA-ONLY-TOKEN" in first_text
    assert "BETA-ONLY-TOKEN" not in first_text
    assert "BETA-ONLY-TOKEN" in second_text
    assert "ALPHA-ONLY-TOKEN" not in second_text
    assert store.get(first.id) is not None
    assert all(chunk.document_id == first.id for chunk in first_session.chunks)
    assert all(chunk.document_id == second.id for chunk in second_session.chunks)


def test_session_reads_are_copies() -> None:
    service, store = _service()
    document = service.ingest("paper.pdf", "application/pdf", build_pdf(["Finding one"]))
    fetched = store.get(document.id)
    assert fetched is not None
    fetched.chunks.clear()
    fetched.pages.clear()
    again = store.get(document.id)
    assert again is not None
    assert len(again.chunks) == 1
    assert len(again.pages) == 1


def test_stored_log_does_not_include_document_text() -> None:
    configure_logging("INFO")
    captured: list[str] = []

    class Capture(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            captured.append(JsonFormatter().format(record))

    logging.getLogger("sophia").addHandler(Capture())
    try:
        service, _store = _service()
        service.ingest("paper.pdf", "application/pdf", build_pdf(["UNIQUEPAPERTOKEN"]))
    finally:
        logging.getLogger("sophia").handlers.pop()

    assert captured
    assert all("UNIQUEPAPERTOKEN" not in line for line in captured)
