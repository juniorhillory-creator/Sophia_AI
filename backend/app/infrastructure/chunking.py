from uuid import UUID

from app.infrastructure.pdf import PageText
from app.schemas.models import Chunk

_SEPARATORS = ("\n\n", "\n", " ", "")


def split_text(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
    separators: tuple[str, ...] = _SEPARATORS,
) -> list[str]:
    if chunk_size < 1:
        raise ValueError("chunk_size must be positive")
    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")
    return _split(text.strip(), chunk_size, chunk_overlap, separators)


def chunk_pages(
    document_id: UUID,
    pages: list[PageText],
    chunk_size: int,
    chunk_overlap: int,
) -> list[Chunk]:
    chunks: list[Chunk] = []
    # Chunk each page alone so a chunk has one true page number.
    for page in pages:
        parts = split_text(page.text, chunk_size, chunk_overlap)
        for index, part in enumerate(parts):
            chunks.append(
                Chunk(
                    chunk_id=f"{document_id}:{page.page_number}:{index}",
                    document_id=document_id,
                    page_number=page.page_number,
                    index_on_page=index,
                    text=part,
                )
            )
    return chunks


def _split(text: str, size: int, overlap: int, separators: tuple[str, ...]) -> list[str]:
    if not text:
        return []
    if len(text) <= size:
        return [text]
    if not separators:
        return _windows(text, size, overlap)
    separator, *rest = separators
    if separator == "":
        return _windows(text, size, overlap)
    pieces = [piece.strip() for piece in text.split(separator) if piece.strip()]
    if len(pieces) <= 1:
        return _split(text, size, overlap, tuple(rest))
    atoms: list[str] = []
    for piece in pieces:
        if len(piece) <= size:
            atoms.append(piece)
        else:
            atoms.extend(_split(piece, size, overlap, tuple(rest)))
    return _merge(atoms, separator, size, overlap)


def _windows(text: str, size: int, overlap: int) -> list[str]:
    step = size - overlap
    chunks: list[str] = []
    start = 0
    while start < len(text):
        window = text[start : start + size]
        if window.strip():
            chunks.append(window)
        if start + size >= len(text):
            break
        start += step
    return chunks


def _joined_length(parts: list[str], separator: str) -> int:
    if not parts:
        return 0
    return sum(len(part) for part in parts) + len(separator) * (len(parts) - 1)


def _merge(parts: list[str], separator: str, size: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    current: list[str] = []

    def flush() -> None:
        if not current:
            return
        text = separator.join(current).strip()
        if text:
            chunks.append(text)

    for part in parts:
        if len(part) > size:
            raise ValueError("chunk atom exceeds chunk size")
        if not current:
            current.append(part)
            continue
        if _joined_length(current + [part], separator) <= size:
            current.append(part)
            continue
        flush()
        while current and _joined_length(current, separator) > overlap:
            current.pop(0)
        while current and _joined_length(current + [part], separator) > size:
            current.pop(0)
        current.append(part)
    flush()
    return chunks
