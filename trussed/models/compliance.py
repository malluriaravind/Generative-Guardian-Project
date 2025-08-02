from trussed.models import AppDocument

from beanie import PydanticObjectId


class Compliance(AppDocument):
    ownership_id: PydanticObjectId
    data: dict[str, str]
    
