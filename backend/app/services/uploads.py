from collections.abc import AsyncIterator

from starlette.datastructures import Headers, UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser
from starlette.requests import Request

from app.domain.errors import AppError

# Room for multipart boundaries and part headers around a file at the byte cap.
_FRAMING_BYTES = 64 * 1024


async def read_capped(upload: UploadFile, max_bytes: int) -> bytes:
    return await _collect(upload_stream(upload), max_bytes)


async def read_pdf_upload(request: Request, max_bytes: int) -> tuple[str | None, str | None, bytes]:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" not in content_type.lower():
        raise AppError("validation_error", "Request validation failed.", 422)
    raw = await _collect(
        request.stream(),
        max_bytes + _FRAMING_BYTES,
        reported_limit=max_bytes,
    )
    parser = MultiPartParser(
        Headers({"content-type": content_type}),
        _once(raw),
        max_files=1,
        max_fields=5,
    )
    try:
        form = await parser.parse()
    except MultiPartException as exc:
        raise AppError("validation_error", "Request validation failed.", 422) from exc
    try:
        item = form.get("file")
        if not isinstance(item, UploadFile):
            raise AppError("validation_error", "Request validation failed.", 422)
        data = await read_capped(item, max_bytes)
        return item.filename, item.content_type, data
    finally:
        await form.close()


async def upload_stream(upload: UploadFile) -> AsyncIterator[bytes]:
    while True:
        block = await upload.read(1024 * 1024)
        if not block:
            break
        yield block


async def _once(body: bytes) -> AsyncIterator[bytes]:
    yield body


async def _collect(
    chunks: AsyncIterator[bytes],
    max_bytes: int,
    *,
    reported_limit: int | None = None,
) -> bytes:
    blocks: list[bytes] = []
    total = 0
    limit = max_bytes if reported_limit is None else reported_limit
    async for block in chunks:
        if not block:
            continue
        total += len(block)
        if total > max_bytes:
            raise AppError(
                "payload_too_large",
                f"PDF exceeds the {limit} byte upload limit.",
                413,
            )
        blocks.append(block)
    return b"".join(blocks)
