import os
import fcntl

from typing import IO
from hashlib import md5


class Lockfile:
    file: IO

    def __init__(self, name = '.lock', unsafe_name = '', *, directory = ''):
        name = name + md5(unsafe_name.encode()).hexdigest()
        self.file = open(os.path.join(directory, name), 'w')
        fcntl.flock(self.file, fcntl.LOCK_EX | fcntl.LOCK_NB)
    
    def close(self):
        self.file.close()

        try:
            os.remove(self.file.name)
        except OSError:
            pass

    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc, tb):
        self.close()
    
    def __del__(self):
        self.close()

