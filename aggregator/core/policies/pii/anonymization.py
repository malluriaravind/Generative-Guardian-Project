import logging
import attrs
from typing import *

from trussed.models.piibase import predefined_pii_entities
from .redaction import RedactionPiiFilter

log = logging.getLogger(__name__)


@attrs.define(kw_only=True, eq=False)
class AnonymizationPiiFilter(RedactionPiiFilter):
    action = 'Anonymization'

    def redact(self, text: str, entity: str):
        # Use redaction for custom entities to not expose them
        if entity not in predefined_pii_entities:
            return super().redact(text, entity)

        return f'<{entity}>'
