from typing import *

from bson import ObjectId

from trussed.utils.cache import alru_cache
from trussed.models.policies import Policy

from core.providers import Context, Hooks

from core.policies.invisibletext import InvisibleTextFilter
from core.policies.languages import LanguageFilter
from core.policies.injections import InjectionFilter
from core.policies.topics import TopicsFilter

from core.policies.pii import PiiFilter
from core.policies.pii.anonymization import AnonymizationPiiFilter
from core.policies.pii.tokenization import TokenizationPiiFilter
from core.policies.pii.redaction import RedactionPiiFilter
from core.policies.codeprovenance import CodeProvenanceFilter


AnonymizationPiiFilter.register()
TokenizationPiiFilter.register()
RedactionPiiFilter.register()


@alru_cache
async def get_policy_hooks(ts: Hashable, *policies: ObjectId):
    hooks = Hooks()

    async for policy in Policy.find({'_id': {'$in': policies}}):
        for policy_type in policy.controls:
            if policy_type == 'InvisibleText':
                hook = await InvisibleTextFilter.from_policy(policy)
                hooks.add(hook)

            elif policy_type == 'Languages':
                hook = await LanguageFilter.from_policy(policy)
                hooks.add(hook)

            elif policy_type == 'Injection':
                hook = await InjectionFilter.from_policy(policy)
                hooks.add(hook)

            elif policy_type == 'Topics':
                hook = await TopicsFilter.from_policy(policy)
                hooks.add(hook)

            elif policy_type == 'PII':
                if cls := PiiFilter.classes.get(policy.pii.action):
                    hook = await cls.from_policy(policy)
                    hooks.add(hook)

            elif policy_type == 'CodeProvenance':
                hook = await CodeProvenanceFilter.from_policy(policy)
                hooks.add(hook)

    return hooks


async def with_policies(ctx: Context):
    hooks = await get_policy_hooks(ctx.apikey.updated_at, *ctx.apikey.policies)

    if ctx.hooks is not None:
        ctx.hooks.merge(hooks)
    else:
        ctx.hooks = hooks

    return ctx
