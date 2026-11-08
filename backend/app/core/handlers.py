import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.domain.errors import AppError
from app.schemas.models import ErrorBody

logger = logging.getLogger("sophia.api")


def _body(code: str, message: str) -> dict[str, str]:
    return ErrorBody(code=code, message=message).model_dump()


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=_body(exc.code, exc.message))

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        messages: list[str] = []
        for err in errors:
            loc = err.get("loc", ())
            field = [str(x) for x in loc if x != "body"]
            field_name = ".".join(field) if field else ""
            raw_msg = err.get("msg", "Invalid value")
            clean_msg = raw_msg.removeprefix("Value error, ").strip()
            messages.append(f"{field_name}: {clean_msg}" if field_name else clean_msg)

        detail_msg = "; ".join(messages) if messages else "Request validation failed."
        logger.warning(
            "validation_error",
            extra={
                "http_path": request.url.path,
                "http_method": request.method,
                "validation_errors": detail_msg,
            },
        )
        return JSONResponse(
            status_code=422,
            content=_body("validation_error", detail_msg),
        )

    @app.exception_handler(HTTPException)
    async def http_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(status_code=exc.status_code, content=_body("http_error", message))

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, _exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error", extra={"http_path": request.url.path})
        return JSONResponse(
            status_code=500,
            content=_body("internal_error", "Something went wrong."),
        )
