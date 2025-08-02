import os

from .utils.logging import configure_logging
from .utils.logging.ctx import patch_ctx_logging


if LOGGING_PATCH := os.environ.get('LOGGING_PATCH', '1') in ('1', 'y', 'yes'):
    patch_ctx_logging()

if LOGGING_ASAP := os.environ.get('LOGGING_ASAP', '1') in ('1', 'y', 'yes'):
    configure_logging()
