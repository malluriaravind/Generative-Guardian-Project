import os
import time
import string
import struct

from typing import Callable


def tokengetter(urandom: Callable[[int], bytes] = os.urandom, *, length: int):
    """Return callable that generates ASCII-encoded random token"""
    ascii256 = ((string.digits + string.ascii_letters) * 5)[:256].encode()

    def randtoken():
        """Return ASCII-encoded random token from /dev/urandom"""
        return urandom(length).translate(ascii256).decode()

    return randtoken


def seq_binary12() -> bytes:
    return packseq(int(time.time()), time.monotonic_ns())


def seq_binary16() -> bytes:
    return packseq_d(time.time(), time.monotonic())
    return ((time.time_ns() << 64) | time.monotonic_ns()).to_bytes(16)

packseq = struct.Struct('>LQ').pack

packseq_d = struct.Struct('>dd').pack

# Example
# generate_token = tokengetter(length=48)
# print(generate_token())
