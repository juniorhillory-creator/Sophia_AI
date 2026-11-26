import pytest
from unittest.mock import MagicMock, AsyncMock
from google.genai.errors import APIError

from app.domain.errors import AppError
from app.infrastructure.gemini import GeminiClient, _extract_messages, _map_error


def test_extract_messages_separates_system_and_user():
    messages = [
        {"role": "system", "content": "You are a research assistant."},
        {"role": "user", "content": "What is the capital of France?"},
    ]
    system, prompt = _extract_messages(messages)
    assert system == "You are a research assistant."
    assert prompt == "What is the capital of France?"


def test_extract_messages_no_system():
    messages = [
        {"role": "user", "content": "Hello"},
    ]
    system, prompt = _extract_messages(messages)
    assert system is None
    assert prompt == "Hello"


def test_complete_success(monkeypatch):
    client = GeminiClient(api_key="test-key")
    mock_response = MagicMock()
    mock_response.text = "This is a response."
    mock_generate = MagicMock(return_value=mock_response)
    monkeypatch.setattr(client._client.models, "generate_content", mock_generate)

    result = client.complete(
        [{"role": "user", "content": "Hi"}],
        json_schema=None,
        timeout=30.0,
    )
    assert result == "This is a response."
    assert mock_generate.call_count == 1


def test_complete_empty_response_raises_app_error(monkeypatch):
    client = GeminiClient(api_key="test-key")
    mock_response = MagicMock()
    mock_response.text = "   "
    mock_generate = MagicMock(return_value=mock_response)
    monkeypatch.setattr(client._client.models, "generate_content", mock_generate)

    with pytest.raises(AppError) as exc_info:
        client.complete(
            [{"role": "user", "content": "Hi"}],
            json_schema=None,
            timeout=30.0,
        )
    assert exc_info.value.code == "malformed_model_response"
    assert exc_info.value.status_code == 502


def test_complete_api_error_mapping(monkeypatch):
    client = GeminiClient(api_key="test-key")
    error = APIError(504, {"error": {"message": "Timeout"}})
    monkeypatch.setattr(client._client.models, "generate_content", MagicMock(side_effect=error))

    with pytest.raises(AppError) as exc_info:
        client.complete(
            [{"role": "user", "content": "Hi"}],
            json_schema=None,
            timeout=30.0,
        )
    assert exc_info.value.code == "model_timeout"
    assert exc_info.value.status_code == 504


@pytest.mark.anyio
async def test_stream_success(monkeypatch):
    client = GeminiClient(api_key="test-key")

    class MockAsyncStream:
        def __init__(self, chunks):
            self._chunks = chunks

        def __aiter__(self):
            self._iter = iter(self._chunks)
            return self

        async def __anext__(self):
            try:
                return next(self._iter)
            except StopIteration:
                raise StopAsyncIteration

    chunk1 = MagicMock(text="Hello ")
    chunk2 = MagicMock(text="world!")
    mock_stream = MockAsyncStream([chunk1, chunk2])

    mock_generate_stream = AsyncMock(return_value=mock_stream)
    monkeypatch.setattr(client._client.aio.models, "generate_content_stream", mock_generate_stream)

    tokens = []
    async for token in client.stream([{"role": "user", "content": "Hi"}], timeout=30.0):
        tokens.append(token)

    assert tokens == ["Hello ", "world!"]


def test_map_error_status_codes():
    err_timeout = _map_error(APIError(408, {"error": "Timeout"}))
    assert err_timeout.code == "model_timeout"
    assert err_timeout.status_code == 504

    err_rate_limit = _map_error(APIError(429, {"error": "Rate limit"}))
    assert err_rate_limit.code == "model_unavailable"
    assert err_rate_limit.status_code == 429

    err_auth = _map_error(APIError(401, {"error": "Unauthorized"}))
    assert err_auth.code == "model_unavailable"
    assert err_auth.status_code == 503

