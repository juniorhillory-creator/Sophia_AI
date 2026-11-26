import json
from unittest.mock import MagicMock

import pytest

from app.domain.errors import AppError
from app.infrastructure.cerebras import CerebrasClient, _text_content


def test_complete_posts_strict_json_schema(monkeypatch):
    client = CerebrasClient(api_key="test-key")
    response = MagicMock()
    response.is_error = False
    response.json.return_value = {"choices": [{"message": {"content": '{"answer":"ok"}'}}]}
    post = MagicMock(return_value=response)
    monkeypatch.setattr("app.infrastructure.cerebras.httpx.post", post)

    result = client.complete(
        [{"role": "user", "content": "Hi"}],
        json_schema={"type": "object"},
        timeout=7,
    )

    assert result == '{"answer":"ok"}'
    args, kwargs = post.call_args
    assert args[0] == "https://api.cerebras.ai/v1/chat/completions"
    assert kwargs["json"] == {
        "model": "qwen-3.8-27b",
        "messages": [{"role": "user", "content": "Hi"}],
        "max_completion_tokens": 4096,
        "reasoning_effort": "none",
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "sophia_response",
                "strict": True,
                "schema": {"type": "object"},
            },
        },
    }
    assert kwargs["headers"]["Authorization"] == "Bearer test-key"
    assert kwargs["timeout"] == 7


def test_complete_requires_cerebras_key():
    client = CerebrasClient()
    with pytest.raises(AppError) as caught:
        client.complete([], json_schema=None, timeout=1)
    assert caught.value.code == "model_not_configured"


def test_complete_maps_rate_limit_without_exposing_provider_body(monkeypatch):
    client = CerebrasClient(api_key="test-key")
    response = MagicMock()
    response.is_error = True
    response.status_code = 429
    response.content = json.dumps({"error": {"message": "slow down"}}).encode()
    monkeypatch.setattr("app.infrastructure.cerebras.httpx.post", MagicMock(return_value=response))

    with pytest.raises(AppError) as caught:
        client.complete([], json_schema=None, timeout=1)
    assert caught.value.code == "model_rate_limited"
    assert "slow down" not in caught.value.message


def test_complete_retries_once_when_retry_after_is_short(monkeypatch):
    client = CerebrasClient(api_key="test-key")
    limited = MagicMock()
    limited.status_code = 429
    limited.headers = {"retry-after": "2"}
    limited.content = b"{}"
    limited.is_error = True

    success = MagicMock()
    success.status_code = 200
    success.is_error = False
    success.json.return_value = {"choices": [{"message": {"content": "ok"}}]}

    post = MagicMock(side_effect=[limited, success])
    sleep = MagicMock()
    monkeypatch.setattr("app.infrastructure.cerebras.httpx.post", post)
    monkeypatch.setattr("app.infrastructure.cerebras.time.sleep", sleep)

    result = client.complete([], json_schema=None, timeout=1)

    assert result == "ok"
    assert post.call_count == 2
    sleep.assert_called_once_with(2)


def test_rate_limit_error_suggests_wait_from_retry_after():
    from app.infrastructure.cerebras import _http_error

    error = _http_error(429, b"{}", retry_after=12)
    assert error.code == "model_rate_limited"
    assert "12 seconds" in error.message


def test_rate_limit_error_identifies_token_bucket():
    from app.infrastructure.cerebras import _http_error

    error = _http_error(
        429,
        json.dumps({"error": {"message": "uncached token limit exceeded"}}).encode(),
    )
    assert "uncached-token limit" in error.message


def test_text_content_extracts_text_from_content_parts():
    assert _text_content(
        [{"type": "text", "text": "summary"}, {"type": "image_url", "image_url": {"url": "ignored"}}]
    ) == "summary"
    assert _text_content([{"type": "image_url"}]) is None
