import logging

from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from core.errors import *

log = logging.getLogger(__name__)


async def handle_api_exception(request: Request, e: ApiException):
    log.error("API Exception occurred", exc_info=True, extra={"path": request.url.path, "method": request.method})
    return JSONResponse(e.json, e.code)


async def handle_exception(request: Request, e: Exception):
    log.error(
        "Unhandled Exception",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(e).__name__,
            "exception_message": str(e)
        }
    )
    return JSONResponse(
        {'error': 'InternalServerError', 'message': f'{type(e).__name__}: {e}'}, status_code=500
    )


# Default exception handlers
exception_handlers = {ApiException: handle_api_exception, Exception: handle_exception}
