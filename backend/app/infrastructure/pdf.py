import logging
from collections.abc import Callable
from dataclasses import dataclass

import pymupdf

from app.domain.errors import AppError

logger = logging.getLogger("sophia.pdf")


@dataclass(frozen=True)
class PageText:
    page_number: int
    text: str


def extract_pages(
    data: bytes,
    vision_transcriber: Callable[[bytes], str] | None = None,
) -> list[PageText]:
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
        pages: list[PageText] = []
        for page in document:
            text = page.get_text("text").strip()
            if len(text) < 20 and vision_transcriber is not None:
                try:
                    pix = page.get_pixmap(dpi=150)
                    image_bytes = pix.tobytes("png")
                    transcribed = vision_transcriber(image_bytes)
                    if transcribed:
                        text = transcribed
                except Exception as ocr_err:
                    logger.warning("vision_ocr_page_failed", extra={"page": page.number + 1, "error": str(ocr_err)})
            pages.append(PageText(page_number=page.number + 1, text=text))
    finally:
        document.close()
    if not pages:
        raise AppError("invalid_pdf", "Upload a valid PDF file.", 400)
    if not any(page.text for page in pages):
        raise AppError(
            "empty_document",
            "This PDF has no extractable text. Scanned pages are not supported without an AI Vision model configured.",
            400,
        )
    return pages
