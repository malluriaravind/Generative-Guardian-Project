from hashlib import sha1
from bson import ObjectId


def object_id_color(oid: ObjectId | None = None):
    return '#' + sha1(ObjectId(oid).binary).hexdigest()[:6]
