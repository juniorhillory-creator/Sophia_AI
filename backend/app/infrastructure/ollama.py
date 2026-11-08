import asyncio
import json
import logging
from typing import Any, AsyncIterator
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.domain.errors import AppError

logger = logging.getLogger("sophia.ollama")

_MAX_RESPONSE_BYTES = 1_000_000


class OllamaClient:
    """Local Ollama chat client. This is the default model provider."""

    def __init__(self, base_url: str, model: str, num_gpu: int | None = None) -> None:
        self._url = f"{base_url.rstrip('/')}/api/chat"
        self._model = model
        self._num_gpu = num_gpu

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        json_schema: dict[str, Any] | None,
        timeout: float,
    ) -> str:
        body: dict[str, Any] = {"model": self._model, "messages": messages, "stream": False}
        if self._num_gpu is not None:
            body["options"] = {"num_gpu": self._num_gpu}
        if json_schema is not None:
            body["format"] = json_schema
        request = Request(
            self._url,
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=timeout) as response:
                payload = response.read(_MAX_RESPONSE_BYTES + 1)
        except TimeoutError as exc:
            raise _timeout() from exc
        except HTTPError as exc:
            logger.warning("ollama_http_error", extra={"status_code": exc.code})
            if exc.code in (408, 504):
                raise _timeout() from exc
            raise AppError("model_unavailable", "The local model request failed.", 503) from exc
        except URLError as exc:
            logger.warning("ollama_unreachable", extra={"error_type": type(exc.reason).__name__})
            if isinstance(exc.reason, TimeoutError):
                raise _timeout() from exc
            raise AppError("model_unavailable", "Could not reach the local model.", 503) from exc
        if len(payload) > _MAX_RESPONSE_BYTES:
            raise AppError(
                "malformed_model_response",
                "The model returned an unreadable response.",
                502,
            )
        return _content(payload)

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        timeout: float,
    ) -> AsyncIterator[str]:
        """Stream model response chunks as they arrive."""
        body: dict[str, Any] = {"model": self._model, "messages": messages, "stream": True}
        if self._num_gpu is not None:
            body["options"] = {"num_gpu": self._num_gpu}
        request = Request(
            self._url,
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        loop = asyncio.get_event_loop()
        try:
            # Run blocking urlopen in thread pool
            response = await loop.run_in_executor(None, lambda: urlopen(request, timeout=timeout))
        except TimeoutError as exc:
            raise _timeout() from exc
        except URLError as exc:
            logger.warning("ollama_unreachable", extra={"error_type": type(exc.reason).__name__})
            if isinstance(exc.reason, TimeoutError):
                raise _timeout() from exc
            raise AppError("model_unavailable", "Could not reach the local model.", 503) from exc
        except Exception as exc:
            logger.warning("ollama_error", extra={"error": str(exc)})
            raise AppError("model_unavailable", "Could not reach the local model.", 503) from exc

        try:
            async for line in self._iter_lines(response):
                if not line:
                    continue
                try:
                    parsed = json.loads(line)
                except json.JSONDecodeError:
                    continue
                message = parsed.get("message") if isinstance(parsed, dict) else None
                content = message.get("content") if isinstance(message, dict) else None
                if content:
                    yield content
        finally:
            response.close()

    async def _iter_lines(self, response) -> AsyncIterator[str]:
        """Iterate over response lines asynchronously."""
        loop = asyncio.get_event_loop()
        while True:
            line = await loop.run_in_executor(None, response.readline)
            if not line:
                break
            yield line.decode("utf-8").strip()


def _timeout() -> AppError:
    return AppError("model_timeout", "The local model timed out.", 504)


def _content(payload: bytes) -> str:
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise AppError(
            "malformed_model_response",
            "The model returned an unreadable response.",
            502,
        ) from exc
    message = parsed.get("message") if isinstance(parsed, dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str) or not content.strip():
        raise AppError(
            "malformed_model_response",
            "The model returned an unreadable response.",
            502,
        )
    return content
