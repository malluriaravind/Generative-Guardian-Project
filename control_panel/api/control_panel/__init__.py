import logging

from logging.handlers import RotatingFileHandler
from pythonjsonlogger import jsonlogger
from importlib import import_module
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import Response, JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from starlette.types import Scope
from starlette.exceptions import HTTPException

from control_panel.middlewares.renewjwt import JWTRenewal
from control_panel.middlewares.tz import ContextTimezone

from control_panel import database
from control_panel.errors import ApiException
from control_panel.config import ENVIRONMENT

from trussed import ctx
from trussed.errors import ApiException as ApiException2

import os
from pathlib import Path

# --------------------- Logging Configuration ---------------------

# Set up log directory path
BASE_DIR = Path(__file__).resolve().parent.parent  # Adjusted to three parents up
LOG_DIR = BASE_DIR / 'logs'  # This resolves to /home/azureuser/trussed/control_panel/api/logs

# Global flag to ensure logging is configured only once
_logging_configured = False

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON Formatter that prefixes the log level with 'TC_' and formats asctime.
    """
    def __init__(self, fmt='%(asctime)s %(levelname)s %(message)s', datefmt='%d-%m-%Y %H:%M:%S'):
        super().__init__(fmt, datefmt)

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        # Prefix the log level with 'TC_'
        log_record['levelname'] = f"TC_{record.levelname}"
        
        # Remove unwanted fields if they exist
        for field in ['name', 'taskName']:
            log_record.pop(field, None)

def setup_json_logging():
    """Sets up JSON logging with handlers for DEBUG and ERROR levels."""
    global _logging_configured
    if _logging_configured:
        return  # Logging is already configured

    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)  # Capture all levels

    # Ensure the logs directory exists
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)  # Ensure all parent directories are created
        logger.info(f"Logs directory created at: {LOG_DIR}")
    except Exception as e:
        logger.error(f"Failed to create logs directory at {LOG_DIR}: {e}")
        raise

    # Define custom JSON formatter with desired fields and date format
    json_formatter = CustomJsonFormatter(
        fmt='%(asctime)s %(levelname)s %(message)s',
        datefmt='%d-%m-%Y %H:%M:%S'
    )

    # Create FileHandler for app.log (DEBUG and above)
    app_log_path = LOG_DIR / 'app.log'
    app_file_handler = RotatingFileHandler(
        app_log_path,
        maxBytes=10**6,    # 1 MB per file
        backupCount=5,     # Keep up to 5 backup files
        encoding='utf-8'
    )
    app_file_handler.setFormatter(json_formatter)
    app_file_handler.setLevel(logging.DEBUG)  # Capture DEBUG and above
    logger.addHandler(app_file_handler)

    # Create FileHandler for error.log (ERROR and above)
    error_log_path = LOG_DIR / 'error.log'
    error_file_handler = logging.FileHandler(
        error_log_path,
        encoding='utf-8'
    )
    error_file_handler.setLevel(logging.ERROR)  # Capture ERROR and above
    error_file_handler.setFormatter(json_formatter)
    logger.addHandler(error_file_handler)

    # Stream handler for INFO and above logs to stdout
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)
    stream_handler.setFormatter(json_formatter)
    logger.addHandler(stream_handler)

    # **Configure PyMongo Logging to WARNING Level**
    pymongo_logger = logging.getLogger('pymongo')
    pymongo_logger.setLevel(logging.WARNING)
    pymongo_logger.propagate = False  # Prevent PyMongo logs from propagating to the root logger

    # Prevent logs from being propagated to the root logger multiple times
    logger.propagate = False

    _logging_configured = True  # Mark that logging has been configured

# Initialize JSON logging
setup_json_logging()

# Obtain a logger instance for this module
log = logging.getLogger(__name__)

# --------------------- End of Logging Configuration ---------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        modules = [
            'mocks',
            'openapi',
            'cfg',
            'maintenance',
            'auth',
            'account_management',
            'dashboard',
            'llm',
            'apikey',
            'pool',
            'settings',
            'alert',
            'stats',
            'usage',
            'utilization',
            'budget',
            'pii',
            'sso',
            'policies',
            'invisible_text',
            'jailbreak',
            'logs',
            'weekly_report',
            'codeprov',
            'overview',
            'rbac',
            'scopes',
            'compliance',
        ]

        for name in modules:
            module = import_module(f'control_panel.routes.{name}')
            app.include_router(module.router, prefix='/api')

        await database.init()

        # Start the scheduler – you can use the scheduler file or the integrated version.
        from scheduler.weekly_report_scheduler import start_scheduler
        start_scheduler()

    except Exception as e:
        log.error("Error during app lifespan initialization", exc_info=True)
        raise e
    yield


app = FastAPI(
    lifespan=lifespan,
    title='Generative Guardian / Control Plane API',
    version=open('../VERSION').read().strip(),
    # We control access to OpenAPI in routes/openapi.py
    openapi_url=None,
    docs_url=None,
    redoc_url=None,
)
app.add_middleware(ContextTimezone, to=ctx.ctx.tz)
app.add_middleware(JWTRenewal)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.exception_handler(ApiException)
@app.exception_handler(ApiException2)
async def handle_api_exception(request: Request, e: ApiException):
    log.error("API Exception occurred", exc_info=True)
    return JSONResponse(e.json, e.code)

@app.exception_handler(Exception)
async def handle_exception(request: Request, e: Exception):
    log.error("Unhandled Exception occurred", exc_info=True)
    return JSONResponse(
        {'error': 'InternalServerError', 'message': f'{type(e).__name__}: {e}'},
        status_code=500,
    )

# fmt: off
@app.exception_handler(ValidationError)
@app.exception_handler(RequestValidationError)
def handle_validation_exception(request: Request, e: RequestValidationError):
    log.error("Validation Exception occurred: %s", e, exc_info=True)

    if isinstance(e, RequestValidationError):
        # FastAPI always prepends 'body' to the location, remove it
        loc_slice = slice(1, None, None)
    else:
        loc_slice = slice(None, None, None)

    content = {
        'error': 'ValidationError',
        'fields': [
            {
                'field': error['loc'][loc_slice],
                'message': (
                    error.get('ctx', {}).get('reason')
                    or
                    error['msg'].capitalize()
                ),
                'code': error['type'],
            }
            for error in e.errors()
        ],
    }

    if content['fields']:
        content['message'] = content['fields'][0]['message']

    return JSONResponse(content, status_code=422)
# fmt: on
