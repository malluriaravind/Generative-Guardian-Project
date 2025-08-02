import os
import logging
import logging.config
import yaml

from logging import NOTSET, getLogger, LogRecord, Handler
from bson import ObjectId

from ..queue import LmdbQueue, seq_binary12
from ..cache import cache


def configure_logging(yml='log.yaml'):
    if os.path.exists(yml):
        loaded_config = yaml.safe_load(open(yml).read())
        logging.config.dictConfig(loaded_config)
    else:
        print(f'{yml} config not found ')


@cache
def configure_logging_once(yml='log.yaml'):
    configure_logging(yml)


logger = getLogger(__name__)


class LmdbQueueHandler(Handler):
    def __init__(self, level=NOTSET, *, path = 'persist/queue.logs/', sync=False):
        self.queue = LmdbQueue[dict](path, sync=sync)
        super().__init__(level=level)

    def emit(self, record: LogRecord):
        if record.name == __name__:
            return

        try:
            data = {
                **record.__dict__,
                '_id': ObjectId(seq_binary12()),
                # Nullify probably non-serializable fields
                'msg': None,
                'args': None,
                'exc_info': None
            }
            self.queue.enqueue([data])
        except Exception as e:
            logger.error('Unable to enqueue log record: %s, record=%s', e, record)

