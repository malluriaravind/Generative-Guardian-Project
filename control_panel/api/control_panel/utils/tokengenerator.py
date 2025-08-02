import os
import string


def tokengetter(urandom=os.urandom, *, length):
    """Return callable that generates ASCII-encoded random token"""
    ascii256 = ((string.digits + string.ascii_letters) * 5)[:256].encode()

    def randtoken():
        """Return ASCII-encoded random token from /dev/urandom"""
        return urandom(length).translate(ascii256).decode()

    return randtoken


# Example
# generate_token = tokengetter(length=48)
# print(generate_token())
