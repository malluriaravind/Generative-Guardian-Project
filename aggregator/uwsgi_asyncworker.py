import uwsgi  # type: ignore

import os
import logging
import asyncio
import uvloop
import socket
import signal

from uvicorn import Server
from uvicorn import Config

log = logging.getLogger(__name__)


async def main(app, sockets):
    config = Config(app, log_config='log.yaml')
    server = Server(config)

    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGHUP, server.handle_exit, signal.SIGHUP, None)

    uwsgi.accepting()

    await server.serve(sockets=sockets)


def fromfd(fd):
    return socket.fromfd(fd, socket.AF_UNIX, socket.SOCK_STREAM)


if __name__ == '__main__':
    app = uwsgi.opt.get('module', b'').decode()

    if not app:
        uwsgi.log('The application module is not specified')
        os.kill(uwsgi.masterpid(), signal.SIGTERM)
    else:
        uvloop.run(main(app, sockets=map(fromfd, uwsgi.sockets)))