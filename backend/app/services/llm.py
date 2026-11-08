from typing import Any, AsyncIterator, Protocol


class Llm(Protocol):
    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        json_schema: dict[str, Any] | None,
        timeout: float,
    ) -> str:
        """Return model text. Raise AppError on connection failure, timeout, or a bad payload."""

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        timeout: float,
    ) -> AsyncIterator[str]:
        """Yield model text chunks as they arrive. Raise AppError on failure."""
