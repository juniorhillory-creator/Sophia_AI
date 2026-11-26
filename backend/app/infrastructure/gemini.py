import asyncio
import logging
import time
from typing import Any, AsyncIterator
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.domain.errors import AppError

logger = logging.getLogger("sophia.gemini")


_FALLBACK_MODELS = ("gemini-3.8-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite")
_MAX_RETRIES_PER_MODEL = 2
_INITIAL_BACKOFF = 1.0


def _is_transient_error(exc: Exception) -> bool:
    if not isinstance(exc, APIError):
        return False
    code = getattr(exc, "code", 500)
    msg = str(getattr(exc, "message", exc)).lower()
    if code in (503, 502, 504):
        return True
    if code == 429:
        return True
    if any(
        kw in msg
        for kw in (
            "high demand",
            "overloaded",
            "spikes in demand",
            "temporarily unavailable",
            "resource exhausted",
            "rate limit",
            "too many requests",
        )
    ):
        return True
    return False


def _is_model_unavailable_error(exc: Exception) -> bool:
    if not isinstance(exc, APIError):
        return False
    code = getattr(exc, "code", 500)
    msg = str(getattr(exc, "message", exc)).lower()
    return code in (400, 404) and any(
        kw in msg
        for kw in (
            "not found",
            "not supported",
            "unknown model",
            "model not",
            "is not supported",
            "no longer available",
            "not available",
            "is not available",
        )
    )


_ALLOWED_SCHEMA_KEYS = {
    "type",
    "format",
    "description",
    "nullable",
    "enum",
    "items",
    "properties",
    "required",
}


def _clean_schema(schema: Any) -> Any:
    if not isinstance(schema, dict):
        return schema
    cleaned: dict[str, Any] = {}
    for k, v in schema.items():
        if k in _ALLOWED_SCHEMA_KEYS:
            if k == "properties" and isinstance(v, dict):
                cleaned[k] = {prop: _clean_schema(prop_val) for prop, prop_val in v.items()}
            elif k == "items":
                cleaned[k] = _clean_schema(v)
            else:
                cleaned[k] = v
    return cleaned


class GeminiClient:
    """Google Gemini API client satisfying the Llm protocol."""

    def __init__(self, api_key: str = "", model: str = "gemini-3.8-flash") -> None:
        self._client = genai.Client(api_key=api_key or "DUMMY_KEY")
        self._model = model

    def _call_with_fallback(self, func, **kwargs):
        models_to_try = [self._model] + [m for m in _FALLBACK_MODELS if m != self._model]
        last_exc = None
        for m in models_to_try:
            for attempt in range(_MAX_RETRIES_PER_MODEL):
                try:
                    result = func(model=m, **kwargs)
                    if m != self._model:
                        logger.info("gemini_switched_model", extra={"from": self._model, "to": m})
                        self._model = m
                    return result
                except APIError as exc:
                    last_exc = exc
                    err_msg = str(getattr(exc, "message", exc)).lower()

                    # 1. Invalid API key: fail immediately
                    if "api key" in err_msg or "api_key" in err_msg or "key not valid" in err_msg:
                        raise _map_error(exc) from exc

                    # 2. Schema error: do not rotate or retry, let caller handle schema fallback
                    if "schema" in err_msg or "additional_properties" in err_msg or "additionalproperties" in err_msg:
                        raise exc

                    # 3. Model unsupported / deprecated / not found: try next model candidate immediately
                    if _is_model_unavailable_error(exc):
                        break

                    # 4. Transient high demand / 503 / 429: retry current model with backoff, then rotate
                    if _is_transient_error(exc):
                        if attempt < _MAX_RETRIES_PER_MODEL - 1:
                            backoff = _INITIAL_BACKOFF * (2 ** attempt)
                            logger.warning(
                                "gemini_transient_retry",
                                extra={"model": m, "attempt": attempt + 1, "backoff": backoff, "error": err_msg},
                            )
                            time.sleep(backoff)
                            continue
                        logger.warning("gemini_model_overloaded_rotating", extra={"model": m, "error": err_msg})
                        break

                    # Other non-retryable APIError
                    raise exc
                except Exception as exc:
                    last_exc = exc
                    logger.warning("gemini_call_error", extra={"model": m, "error": str(exc)})
                    break

        if last_exc is not None:
            raise last_exc
        raise AppError("model_unavailable", "No Gemini model was available to process the request.", 503)

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        json_schema: dict[str, Any] | None,
        timeout: float,
    ) -> str:
        system_instruction, contents = _extract_messages(messages)
        cleaned_schema = _clean_schema(json_schema) if json_schema else None
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json" if json_schema else None,
            response_schema=cleaned_schema,
        )
        try:
            response = self._call_with_fallback(
                self._client.models.generate_content,
                contents=contents,
                config=config,
            )
        except APIError as exc:
            err_msg = str(getattr(exc, "message", exc)).lower()
            is_schema_err = any(
                kw in err_msg
                for kw in ("schema", "additional_properties", "additionalproperties", "response_schema")
            )
            # If Google specifically rejects response_schema, retry without schema using pure JSON mime-type
            if cleaned_schema is not None and is_schema_err:
                logger.info("gemini_schema_rejected_fallback_to_json", extra={"error_detail": str(exc)})
                config_no_schema = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                )
                try:
                    response = self._call_with_fallback(
                        self._client.models.generate_content,
                        contents=contents,
                        config=config_no_schema,
                    )
                except APIError as exc2:
                    raise _map_error(exc2) from exc2
            else:
                raise _map_error(exc) from exc
        except AppError:
            raise
        except Exception as exc:
            logger.warning("gemini_error", extra={"error": str(exc)})
            raise AppError("model_unavailable", f"The Gemini request failed: {exc}", 503) from exc

        text = response.text or ""
        if not text.strip():
            raise AppError("malformed_model_response", "The model returned an empty response.", 502)
        return text

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        timeout: float,
    ) -> AsyncIterator[str]:
        system_instruction, contents = _extract_messages(messages)
        config = types.GenerateContentConfig(system_instruction=system_instruction)
        models_to_try = [self._model] + [m for m in _FALLBACK_MODELS if m != self._model]
        last_exc = None

        for m in models_to_try:
            for attempt in range(_MAX_RETRIES_PER_MODEL):
                streamed_any = False
                try:
                    response_stream = await self._client.aio.models.generate_content_stream(
                        model=m,
                        contents=contents,
                        config=config,
                    )
                    async for chunk in response_stream:
                        if chunk.text:
                            streamed_any = True
                            yield chunk.text
                    if m != self._model:
                        logger.info("gemini_switched_stream_model", extra={"from": self._model, "to": m})
                        self._model = m
                    return
                except APIError as exc:
                    last_exc = exc
                    # If tokens have already been streamed to client, do not retry or rotate
                    if streamed_any:
                        raise _map_error(exc) from exc

                    err_msg = str(getattr(exc, "message", exc)).lower()
                    if "api key" in err_msg or "api_key" in err_msg or "key not valid" in err_msg:
                        raise _map_error(exc) from exc
                    if _is_model_unavailable_error(exc):
                        break
                    if _is_transient_error(exc):
                        if attempt < _MAX_RETRIES_PER_MODEL - 1:
                            backoff = _INITIAL_BACKOFF * (2 ** attempt)
                            logger.warning(
                                "gemini_stream_transient_retry",
                                extra={"model": m, "attempt": attempt + 1, "backoff": backoff, "error": err_msg},
                            )
                            await asyncio.sleep(backoff)
                            continue
                        logger.warning("gemini_stream_overloaded_rotating", extra={"model": m, "error": err_msg})
                        break
                    raise _map_error(exc) from exc
                except Exception as exc:
                    last_exc = exc
                    logger.warning("gemini_stream_error", extra={"error": str(exc), "model": m})
                    break

        if last_exc:
            if isinstance(last_exc, APIError):
                raise _map_error(last_exc) from last_exc
            raise AppError("model_unavailable", f"The Gemini stream failed: {last_exc}", 503) from last_exc

    def transcribe_image(
        self,
        image_bytes: bytes,
        *,
        mime_type: str = "image/png",
        prompt: str = (
            "You are an academic document OCR transcription assistant. "
            "Transcribe all text, headings, mathematical formulas, footnotes, and tables "
            "from this scientific research paper page verbatim. "
            "Preserve original layout, paragraph breaks, and scientific terminology. "
            "Do not summarize, extrapolate, or add commentary."
        ),
    ) -> str:
        try:
            response = self._call_with_fallback(
                self._client.models.generate_content,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt,
                ],
            )
        except AppError:
            raise
        except APIError as exc:
            raise _map_error(exc) from exc
        except Exception as exc:
            logger.warning("gemini_vision_error", extra={"error": str(exc)})
            raise AppError("model_unavailable", f"Failed to transcribe scanned document page: {exc}", 503) from exc

        text = response.text or ""
        return text.strip()


def _extract_messages(messages: list[dict[str, str]]) -> tuple[str | None, str]:
    system_parts: list[str] = []
    user_parts: list[str] = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            system_parts.append(content)
        else:
            user_parts.append(content)
    system_instruction = "\n\n".join(system_parts) if system_parts else None
    prompt = "\n\n".join(user_parts)
    return system_instruction, prompt


def _map_error(exc: APIError) -> AppError:
    raw_code = getattr(exc, "code", 500)
    try:
        code = int(raw_code)
    except (ValueError, TypeError):
        code = 500

    msg = getattr(exc, "message", None) or str(exc)
    logger.error("gemini_api_error", extra={"code": code, "error_detail": msg})

    if code in (408, 504):
        return AppError("model_timeout", "The Gemini model request timed out.", 504)
    if code == 429:
        return AppError("model_unavailable", "Gemini rate limit exceeded. Please retry in a moment.", 429)
    if code in (401, 403) or "api_key_invalid" in msg.lower() or "api key not valid" in msg.lower():
        return AppError(
            "model_unavailable",
            "Invalid or unauthorized Gemini API key. Please check your GEMINI_API_KEY environment variable.",
            503,
        )
    if code == 503 or "high demand" in msg.lower() or "overloaded" in msg.lower():
        return AppError(
            "model_unavailable",
            "Gemini is currently experiencing high demand across all fallback models. Spikes are temporary; please retry in a few moments.",
            503,
        )
    return AppError("model_unavailable", f"Gemini API error ({code}): {msg}", 503)

