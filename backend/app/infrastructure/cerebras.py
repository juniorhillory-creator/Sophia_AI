"""Cerebras chat-completions client (OpenAI-compatible API)."""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, AsyncIterator

import httpx

from app.domain.errors import AppError

logger = logging.getLogger("sophia.cerebras")
_CHAT_COMPLETIONS_URL = "https://api.cerebras.ai/v1/chat/completions"
_MAX_RATE_LIMIT_RETRIES = 1
_MAX_RATE_LIMIT_WAIT_SECONDS = 5.0
_MAX_COMPLETION_TOKENS = 4096


class CerebrasClient:
    """Cerebras Inference client satisfying the shared LLM protocol."""

    def __init__(self, api_key: str = "", model: str = "qwen-3.8-27b") -> None:
        self._api_key = api_key
        self._model = model

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        json_schema: dict[str, Any] | None,
        timeout: float,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "max_completion_tokens": _MAX_COMPLETION_TOKENS,
        }
        if self._model == "qwen-3.8-27b":
            # Qwen defaults to high reasoning effort, which can consume the
            # completion budget before producing the answer expected by Sophia.
            payload["reasoning_effort"] = "none"
        if json_schema:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "sophia_response",
                    "strict": True,
                    "schema": json_schema,
                },
            }
        response = self._post(payload, timeout)
        try:
            data = response.json()
        except ValueError as exc:
            logger.warning(
                "cerebras_malformed_response_json",
                extra={"status_code": response.status_code, "content_type": response.headers.get("content-type")},
            )
            raise AppError("malformed_model_response", "The model returned an unreadable response.", 502) from exc
        choices = data.get("choices") if isinstance(data, dict) else None
        choice = choices[0] if isinstance(choices, list) and choices else None
        message = choice.get("message") if isinstance(choice, dict) else None
        text = _text_content(message.get("content")) if isinstance(message, dict) else None
        if not text:
            logger.warning(
                "cerebras_malformed_response_shape",
                extra={
                    "top_level_keys": sorted(data.keys()) if isinstance(data, dict) else [],
                    "choice_keys": sorted(choice.keys()) if isinstance(choice, dict) else [],
                    "message_keys": sorted(message.keys()) if isinstance(message, dict) else [],
                    "finish_reason": choice.get("finish_reason") if isinstance(choice, dict) else None,
                },
            )
            raise AppError("malformed_model_response", "The model returned no readable text.", 502)
        return text

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        timeout: float,
    ) -> AsyncIterator[str]:
        if not self._api_key:
            raise _missing_key()
        payload = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "max_completion_tokens": _MAX_COMPLETION_TOKENS,
        }
        if self._model == "qwen-3.8-27b":
            payload["reasoning_effort"] = "none"
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                for attempt in range(_MAX_RATE_LIMIT_RETRIES + 1):
                    async with client.stream(
                        "POST",
                        _CHAT_COMPLETIONS_URL,
                        headers=self._headers(),
                        json=payload,
                    ) as response:
                        if response.status_code == 429:
                            retry_after = _retry_after_seconds(response.headers)
                            if attempt < _MAX_RATE_LIMIT_RETRIES and _can_retry(retry_after):
                                await asyncio.sleep(retry_after or 0)
                                continue
                            body = await response.aread()
                            raise _http_error(response.status_code, body, retry_after=retry_after)
                        if response.is_error:
                            body = await response.aread()
                            raise _http_error(response.status_code, body)
                        async for line in response.aiter_lines():
                            if not line or not line.startswith("data:"):
                                continue
                            data = line[5:].strip()
                            if data == "[DONE]":
                                break
                            try:
                                event = json.loads(data)
                                content = event["choices"][0]["delta"].get("content")
                            except (ValueError, KeyError, IndexError, TypeError):
                                continue
                            if isinstance(content, str) and content:
                                yield content
                        return
        except httpx.TimeoutException as exc:
            raise AppError("model_timeout", "The Cerebras model timed out.", 504) from exc
        except httpx.RequestError as exc:
            logger.warning("cerebras_stream_connection_error", extra={"error_type": type(exc).__name__})
            raise AppError("model_unavailable", "Could not reach the Cerebras model.", 503) from exc

    def _post(self, payload: dict[str, Any], timeout: float) -> httpx.Response:
        if not self._api_key:
            raise _missing_key()
        for attempt in range(_MAX_RATE_LIMIT_RETRIES + 1):
            try:
                response = httpx.post(
                    _CHAT_COMPLETIONS_URL,
                    headers=self._headers(),
                    json=payload,
                    timeout=timeout,
                )
            except httpx.TimeoutException as exc:
                raise AppError("model_timeout", "The Cerebras model timed out.", 504) from exc
            except httpx.RequestError as exc:
                logger.warning("cerebras_connection_error", extra={"error_type": type(exc).__name__})
                raise AppError("model_unavailable", "Could not reach the Cerebras model.", 503) from exc
            if response.status_code == 429:
                retry_after = _retry_after_seconds(response.headers)
                if attempt < _MAX_RATE_LIMIT_RETRIES and _can_retry(retry_after):
                    time.sleep(retry_after or 0)
                    continue
                raise _http_error(response.status_code, response.content, retry_after=retry_after)
            if response.is_error:
                raise _http_error(response.status_code, response.content)
            return response
        raise _rate_limit_error(None)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"}


def _missing_key() -> AppError:
    return AppError("model_not_configured", "CEREBRAS_API_KEY is required when AI_PROVIDER=cerebras.", 503)


def _text_content(content: Any) -> str | None:
    if isinstance(content, str):
        return content.strip() or None
    if isinstance(content, list):
        text_parts = [
            part.get("text", "")
            for part in content
            if isinstance(part, dict) and isinstance(part.get("text"), str)
        ]
        joined = "".join(text_parts).strip()
        return joined or None
    return None


def _retry_after_seconds(headers: Any) -> float | None:
    value = headers.get("retry-after") if headers else None
    if value is None:
        return None
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        try:
            retry_at = parsedate_to_datetime(str(value))
            if retry_at.tzinfo is None:
                retry_at = retry_at.replace(tzinfo=timezone.utc)
            return max(0.0, (retry_at - datetime.now(timezone.utc)).total_seconds())
        except (TypeError, ValueError, OverflowError):
            return None


def _can_retry(retry_after: float | None) -> bool:
    return retry_after is not None and retry_after <= _MAX_RATE_LIMIT_WAIT_SECONDS


def _rate_limit_error(retry_after: float | None) -> AppError:
    if retry_after is not None:
        wait_seconds = max(1, round(retry_after))
        message = (
            f"The Cerebras API rate limit was reached. Wait about {wait_seconds} seconds, "
            "or check your account's usage limits."
        )
    else:
        message = "The Cerebras API rate limit was reached. Check your account's usage limits and try again later."
    return AppError("model_rate_limited", message, 503)


def _http_error(status_code: int, body: bytes, *, retry_after: float | None = None) -> AppError:
    detail = ""
    try:
        payload = json.loads(body)
        detail = str(payload.get("error", {}).get("message", "")) if isinstance(payload, dict) else ""
    except (ValueError, AttributeError):
        pass
    detail_lower = detail.lower()
    if status_code in (401, 403) or "api key" in detail_lower or "authentication" in detail_lower:
        return AppError("invalid_api_key", "The Cerebras API key was rejected.", 503)
    if status_code == 429:
        if "uncached" in detail_lower and "token" in detail_lower:
            return AppError(
                "model_rate_limited",
                "The Cerebras uncached-token limit was reached. Wait for capacity to replenish or check your account limits.",
                503,
            )
        if "total" in detail_lower and "token" in detail_lower:
            return AppError(
                "model_rate_limited",
                "The Cerebras total-token limit was reached. Wait for capacity to replenish or check your account limits.",
                503,
            )
        if "request" in detail_lower and ("minute" in detail_lower or "rpm" in detail_lower):
            return AppError(
                "model_rate_limited",
                "The Cerebras request-rate limit was reached. Wait for capacity to replenish or check your account limits.",
                503,
            )
        return _rate_limit_error(retry_after)
    logger.warning("cerebras_api_error", extra={"status_code": status_code})
    return AppError("model_unavailable", "The Cerebras request failed. Check the model and API settings.", 502)
