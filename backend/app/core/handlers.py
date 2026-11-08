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
    async def validation_handler(_request: Request, _exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_body("validation_error", "Request validation failed."),
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
