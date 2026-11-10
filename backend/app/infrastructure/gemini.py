import logging
from typing import Any, AsyncIterator
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.domain.errors import AppError

logger = logging.getLogger("sophia.gemini")


_FALLBACK_MODELS = ("gemini-3.8-flash", "gemini-2.5-flash", "gemini-1.5-flash")


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

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def _call_with_fallback(self, func, **kwargs):
        models_to_try = [self._model] + [m for m in _FALLBACK_MODELS if m != self._model]
        last_exc = None
        for m in models_to_try:
            try:
                result = func(model=m, **kwargs)
                if m != self._model:
                    logger.info("gemini_switched_model", extra={"from": self._model, "to": m})
                    self._model = m
                return result
            except APIError as exc:
                last_exc = exc
                err_code = getattr(exc, "code", 500)
                err_msg = str(getattr(exc, "message", exc)).lower()
                # If API key is invalid, fail immediately with clear key message
                if "api key" in err_msg or "api_key" in err_msg or "key not valid" in err_msg:
                    raise _map_error(exc) from exc
                # If schema error, do not rotate models - let caller handle schema fallback
                if "schema" in err_msg or "additional_properties" in err_msg or "additionalproperties" in err_msg:
                    raise exc
                # If model is invalid, unsupported, or not found, try next candidate
                if err_code in (400, 404) and any(kw in err_msg for kw in ("not found", "not supported", "unknown model", "model not", "is not supported")):
                    continue
                raise exc
        raise last_exc

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
            # If Google rejects response_schema, retry without schema using pure JSON mime-type
            if cleaned_schema is not None:
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
        try:
            response_stream = await self._client.aio.models.generate_content_stream(
                model=self._model,
                contents=contents,
                config=config,
            )
            async for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except APIError as exc:
            raise _map_error(exc) from exc
        except Exception as exc:
            logger.warning("gemini_stream_error", extra={"error": str(exc)})
            raise AppError("model_unavailable", "The Gemini stream failed.", 503) from exc

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
    return AppError("model_unavailable", f"Gemini API error ({code}): {msg}", 503)

