import asyncio
import logging
import uvloop
import contextlib
import traceback
import random

from typing import *


logger = logging.getLogger(__name__)


async def tick_forever(delay: float, f: Callable, *args, **kwargs):
    await f(*args, **kwargs)

    while True:
        await asyncio.sleep(delay + random.random())
        await f(*args, **kwargs)


async def main():
    import db
    import core.alert
    import core.budget
    import core.mailing

    from trussed.models.logrecord import LmdbQueueLogConsumer

    await db.init()

    logs = LmdbQueueLogConsumer()

    with contextlib.suppress(asyncio.CancelledError):
        async with asyncio.TaskGroup() as group:
            group.create_task(tick_forever(60, core.alert.recycler))
            group.create_task(tick_forever(10, core.alert.watchdog))
            group.create_task(tick_forever(10, core.mailing.sendmail))
            group.create_task(tick_forever(10, core.budget.maintain))
            group.create_task(tick_forever(2, logs.consumeall))


async def run():
    try:
        await main()
    except Exception:
        traceback.print_exc()


if __name__ == '__main__':
    uvloop.run(run())
