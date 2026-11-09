import json
import logging
from typing import cast

import pytest
from fastapi import UploadFile
from pydantic import ValidationError

from app.core.log_config import JsonFormatter
from app.core.settings import Settings
from app.domain.errors import AppError
from app.services.ingestion import validate_declared_file
from app.services.uploads import _collect, read_capped


def test_default_upload_limit_is_20_mebibytes() -> None:
    assert Settings.model_fields["max_upload_bytes"].default == 20 * 1024 * 1024


def test_chunk_overlap_must_be_smaller_than_chunk_size() -> None:
    with pytest.raises(ValidationError):
        Settings(chunk_size=10, chunk_overlap=10)


def test_retrieval_defaults_stay_in_range() -> None:
    assert Settings.model_fields["retrieval_top_k"].default == 4
    assert Settings.model_fields["similarity_threshold"].default == 0.3
    assert Settings.model_fields["embedding_model"].default == "all-MiniLM-L6-v2"
    with pytest.raises(ValidationError):
        Settings(retrieval_top_k=2)
    with pytest.raises(ValidationError):
        Settings(similarity_threshold=1.1)


def test_ollama_defaults_are_local() -> None:
    assert Settings.model_fields["ollama_base_url"].default == "http://127.0.0.1:11434"
    assert Settings.model_fields["ollama_model"].default == "llama3.2"
    with pytest.raises(ValidationError):
        Settings(ollama_model="  ")
    with pytest.raises(ValidationError):
        Settings(ollama_timeout_seconds=0)


def test_gemini_defaults_and_validation() -> None:
    assert Settings.model_fields["gemini_model"].default == "gemini-3.8-flash"
    assert Settings.model_fields["gemini_api_key"].default == ""
    assert Settings.model_fields["llm_timeout_seconds"].default == 120
    with pytest.raises(ValidationError):
        Settings(gemini_model="   ")
    with pytest.raises(ValidationError):
        Settings(llm_timeout_seconds=0)
    with pytest.raises(ValidationError):
        Settings(llm_timeout_seconds=-5)


def test_cors_origins_accept_a_comma_separated_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://a.test, http://b.test")
    settings = Settings()
    assert settings.cors_origins == ["http://a.test", "http://b.test"]


def test_pdf_extension_and_mime_type() -> None:
    assert validate_declared_file(r"..\papers\notes.PDF", "application/pdf; charset=binary") == "notes.PDF"

    with pytest.raises(AppError) as empty:
        validate_declared_file("", "application/pdf")
    assert empty.value.code == "invalid_pdf"

    with pytest.raises(AppError) as extension:
        validate_declared_file("notes.txt", "application/pdf")
    assert extension.value.code == "invalid_pdf"
    assert "extension" in extension.value.message

    with pytest.raises(AppError) as media:
        validate_declared_file("notes.pdf", "text/plain")
    assert "application/pdf" in media.value.message


@pytest.mark.asyncio
async def test_read_capped_stops_at_the_limit() -> None:
    class FakeUpload:
        def __init__(self) -> None:
            self.reads = 0

        async def read(self, size: int = -1) -> bytes:
            self.reads += 1
            if self.reads > 3:
                raise AssertionError("read continued after the limit")
            return b"x" * 10

    upload = FakeUpload()
    with pytest.raises(AppError) as caught:
        await read_capped(cast(UploadFile, upload), 25)
    assert caught.value.status_code == 413
    assert caught.value.code == "payload_too_large"
    assert upload.reads == 3

    class ExactUpload:
        def __init__(self, data: bytes) -> None:
            self._data = data

        async def read(self, size: int = -1) -> bytes:
            data = self._data
            self._data = b""
            return data

    assert await read_capped(cast(UploadFile, ExactUpload(b"%PDF-1.7")), 8) == b"%PDF-1.7"


@pytest.mark.asyncio
async def test_request_stream_stops_past_the_limit() -> None:
    async def chunks():
        yield b"x" * 10
        yield b"x" * 10
        yield b"x" * 10
        raise AssertionError("read continued after the limit")

    with pytest.raises(AppError) as caught:
        await _collect(chunks(), 25)
    assert caught.value.status_code == 413


def test_log_formatter_emits_json_fields() -> None:
    record = logging.LogRecord(
        name="sophia.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="document_stored",
        args=(),
        exc_info=None,
    )
    setattr(record, "document_id", "abc")
    payload = json.loads(JsonFormatter().format(record))
    assert payload["message"] == "document_stored"
    assert payload["level"] == "INFO"
    assert payload["logger"] == "sophia.test"
    assert payload["document_id"] == "abc"
    assert "pathname" not in payload
