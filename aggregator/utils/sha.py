from hashlib import sha256


def sha256hex(x: str) -> str:
    return sha256(str.encode(x)).hexdigest()
