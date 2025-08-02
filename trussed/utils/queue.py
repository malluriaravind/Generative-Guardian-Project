import time
import struct
import logging
import pickle
import lmdb

from typing import Any


logger = logging.getLogger(__name__)


class LmdbQueue[T]:
    def __init__(self, path: str, map_size=1024 * 1024 * 512, sync=False, writemap=True):
        self.dumps = pickle.dumps
        self.loads = pickle.loads
        self.batch_size = 25
        self.mdb = lmdb.open(path, map_size=map_size, sync=sync, writemap=writemap)

    async def save(self, records: list[T]) -> None | Any:
        raise NotImplementedError

    def enqueue(self, records: list[T]):
        pickled = self.dumps(records)

        with self.mdb.begin(write=True) as txn:
            key = seq_binary12()

            if not txn.put(key, pickled, append=True):
                txn.put(key, pickled, append=False)

        return key

    async def consumeall(self):
        while await self.consume():
            pass

    async def consume(self):
        n, records = self.fetch_nfirst()

        if n:
            try:
                result = await self.save(records)

            except Exception:
                self.delete_nfirst(n)
                raise

            if result is None:
                self.delete_nfirst(n)

        return n

    def fetch_nfirst(self) -> tuple[int, list[T]]:
        n = 0
        records: list[T] = []

        with self.mdb.begin(write=False) as txn:
            cursor = txn.cursor()

            for n, (key, value) in enumerate(cursor, start=1):
                try:
                    records.extend(pickle.loads(value))
                except (TypeError, pickle.PickleError) as e:
                    logger.error('Unable to deserialize queued records: %s', e)

                if n >= self.batch_size:
                    break

        return n, records

    def delete_nfirst(self, n: int):
        with self.mdb.begin(write=True) as txn:
            cursor = txn.cursor()
            cursor.first()

            for i in range(n):
                if not cursor.delete():
                    break


def seq_binary12() -> bytes:
    return packseq(int(time.time()), time.monotonic_ns())


packseq = struct.Struct('>LQ').pack
