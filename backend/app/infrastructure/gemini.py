import logging
from typing import Any, AsyncIterator
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.domain.errors import AppError

logger = logging.getLogger("sophia.gemini")


class GeminiClient:
    """Google Gemini API client satisfying the Llm protocol."""

    def __init__(self, api_key: str, model: str = "gemini-3.8-flash") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        json_schema: dict[str, Any] | None,
        timeout: float,
    ) -> str:
        system_instruction, contents = _extract_messages(messages)
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json" if json_schema else None,
            response_schema=json_schema,
        )
        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=contents,
                config=config,
            )
        except APIError as exc:
            raise _map_error(exc) from exc
        except Exception as exc:
            logger.warning("gemini_error", extra={"error": str(exc)})
            raise AppError("model_unavailable", "The Gemini request failed.", 503) from exc

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

    if code in (408, 504):
        return AppError("model_timeout", "The Gemini model request timed out.", 504)
    if code == 429:
        return AppError("model_unavailable", "Gemini rate limit exceeded. Please retry in a moment.", 429)
    if code in (401, 403):
        return AppError("model_unavailable", "Invalid or unauthorized Gemini API key.", 503)
    return AppError("model_unavailable", f"Gemini API error ({code}).", 503)

