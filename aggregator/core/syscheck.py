from logging import Logger
from psutil import virtual_memory

from core import env
from core.errors import ResourceIsNotReadyError


# TODO: Create lockfile-powered ContextManager
def ram(log: Logger, required: int | None = None):
    if required and env.bool('CHECK_FREE_RAM', True):
        if required > (free_ram := virtual_memory().available):
            log.error(
                'Insufficient available RAM: required=%iMb, available=%iMb',
                required / 1048576,
                free_ram / 1048576,
            )
            raise ResourceIsNotReadyError('Insufficient available RAM to initialize resource')
