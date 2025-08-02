import time
import dataclasses

from typing import Callable


@dataclasses.dataclass(slots=True)
class TimeIt:
    """
    A context manager for measuring execution time
    """

    start: float = 0
    elapsed: float = 0
    timer: Callable[[], float] = time.perf_counter

    def __enter__(self):
        self.start = self.timer()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = self.timer() - self.start


@dataclasses.dataclass(slots=True)
class CumulativeTimeIt(TimeIt):
    '''
    A subclass of TimeIt extending its functionality to measure cumulative execution time
    '''
    total_elapsed: float = 0
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = self.timer() - self.start
        self.total_elapsed += self.elapsed

