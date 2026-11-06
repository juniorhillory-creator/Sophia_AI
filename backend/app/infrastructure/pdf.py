import logging
from dataclasses import dataclass

import pymupdf

from app.domain.errors import AppError

logger = logging.getLogger("sophia.pdf")


@dataclass(frozen=True)
class PageText:
    page_number: int
    text: str


def extract_pages(data: bytes) -> list[PageText]:
    if b"%PDF" not in data[:1024]:
        raise AppError("invalid_pdf", "Upload a valid PDF file.", 400)
    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:
        logger.warning("pdf_open_failed", extra={"error_type": type(exc).__name__})
        raise AppError("invalid_pdf", "Upload a valid PDF file.", 400) from exc
    try:
        if document.is_encrypted and not document.authenticate(""):
            raise AppError("invalid_pdf", "This PDF is password-protected.", 400)
        pages = [
            PageText(page_number=page.number + 1, text=page.get_text("text").strip())
            for page in document
        ]
    finally:
        document.close()
    if not pages:
        raise AppError("invalid_pdf", "Upload a valid PDF file.", 400)
    if not any(page.text for page in pages):
        raise AppError(
            "empty_document",
            "This PDF has no extractable text. Scanned pages are not supported.",
            400,
        )
    return pages
