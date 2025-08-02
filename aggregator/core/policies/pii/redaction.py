import logging
import attrs

from typing import *
from trussed.models.policies import Policy
from . import PiiFilter

log = logging.getLogger(__name__)


@attrs.define(kw_only=True, eq=False)
class RedactionPiiFilter(PiiFilter):
    action = 'Redaction'
    redaction_character: str

    @classmethod
    async def from_policy(self, policy: Policy):
        return await super().from_policy(
            policy,
            redaction_character=policy.pii.redaction_character,
        )

    def redact(self, pii: str, entity: str):
        return self.redaction_character * len(pii)
