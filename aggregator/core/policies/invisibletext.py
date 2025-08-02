import regex
import attrs

from typing import *

from trussed.utils.cache import lru_cache
from trussed.models.policies import Policy, PolicyType, InvisibleTextAction
from trussed.models.usage import PolicyEvent

from core.types import ChatCompletionCreate
from core.errors import InvisibleTextError
from core.providers import Context, ModelResponse, BaseHook


@attrs.define(eq=False)
class InvisibleTextFilter(BaseHook):
    policy_type: ClassVar[PolicyType] = 'InvisibleText'

    action: InvisibleTextAction
    pattern: Pattern[str]

    @classmethod
    async def from_policy(cls, policy: Policy) -> Self:
        action = policy.invisible_text.action
        pattern = regex.compile(r'[\p{Cf}\p{Co}\p{Cn}]')

        return cls(
            name=f'{policy.name} | {cls.policy_type} ({action})',
            action=action,
            pattern=pattern,
        )

    def set_usage(self, ctx: Context, text: str, ncharacters: int):
        ctx.usage_policy_events.append(
            PolicyEvent(
                policy=self.policy_type,
                action=self.action,
                priority=1,
            )
        )
        ctx.usage_policy_digest.update(f'{text}{id(self)}'.encode())

    @lru_cache(maxsize=512)
    def operate(self, text):
        return self.pattern.sub('', text)

    async def on_completion(self, ctx: Context, body: ChatCompletionCreate):
        for message in body['messages']:
            if message['role'] == 'user':
                content = self.operate(message['content'])

                if ncharacters := len(message['content']) - len(content):
                    self.set_usage(ctx, message['content'], ncharacters)

                    if self.action == 'Sanitization':
                        message['content'] = content
                    else:
                        raise InvisibleTextError()

        async def on_return(response: ModelResponse | Any):
            return response

        return on_return

