import logging
import lmdb
import time
import orjson

from typing import *
from bson import ObjectId

from trussed.models.budget import Budget
from trussed.models import budgetctl


log = logging.getLogger(__name__)
mdb = lmdb.open('cache.budgetusage', sync=False, map_size=1024 * 1024 * 128)


class CachedBudgetStats(TypedDict):
    usage: float
    budget: float
    remaining: float
    updated_at: float


async def maintain():
    async for budget in Budget.find(Budget.limited == True):
        try:
            usage = await budgetctl.check_appllm(budget, unlocking=False)

            if budget.watch and usage:
                appllm_id = budget.watch[0]['object_id']
                cache_put(appllm_id=appllm_id, usage=usage, budget=budget.budget)

        except Exception as e:
            log.exception(e)


def cache_put(appllm_id: ObjectId, usage: float, budget: float):
    with mdb.begin(write=True) as txn:
        data = CachedBudgetStats(
            usage=usage,
            budget=budget,
            remaining=budget - usage,
            updated_at=time.time(),
        )
        txn.put(appllm_id.binary, orjson.dumps(data))


def cache_delete(appllm_id: ObjectId):
    with mdb.begin(write=True) as txn:
        return txn.delete(appllm_id.binary)


def cache_get(appllm_id: ObjectId, *, ttl: float) -> CachedBudgetStats | None:
    data: CachedBudgetStats | None

    with mdb.begin() as txn:
        data = orjson.loads(txn.get(appllm_id.binary, default=b'null'))

        if data is not None and ttl:
            if ttl < time.time() - data['updated_at']:
                return None

        return data