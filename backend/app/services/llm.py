from typing import Any, Protocol


class Llm(Protocol):
    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        json_schema: dict[str, Any] | None,
        timeout: float,
    ) -> str:
        """Return model text. Raise AppError on connection failure, timeout, or a bad payload."""
