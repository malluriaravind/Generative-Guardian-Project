import re
import logging
import attrs

from typing import Any, ClassVar, Self, Pattern, TypedDict
from pydantic.dataclasses import dataclass

from codeprov.scanner import Scanner

from trussed.utils.cache import lru_cache
from trussed.models.policies import Policy, PolicyType
from trussed.models.usage import PolicyEvent

from core.types import ChatCompletionCreate
from core.providers import Context, ModelResponse, BaseHook


logger = logging.getLogger(__name__)


class Attribution(TypedDict):
    url: str
    licenses: list[str]


def build_footnote(attributions: list[Attribution]) -> str:
    notes = []

    for i in attributions:
        notes.append(
            f'[{i["url"]}]\n'
            f'Licenses: {", ".join(i["licenses"])}'
        )

    return '\n\n'.join(notes)


@attrs.define(eq=False)
class CodeProvenanceFilter(BaseHook):
    policy_type: ClassVar[PolicyType] = 'CodeProvenance'

    fenced_code_pattern: ClassVar[Pattern] = re.compile(
        r'```(?P<language>\w*)\n(?P<content>.*?)```',
        re.DOTALL,
    )

    scanners: dict[str, Scanner]
    add_footnotes: bool = True
    add_metadata: bool = True
    fullscan: bool = False

    @classmethod
    async def from_policy(cls, policy: Policy) -> Self:
        assert policy.code_provenance, 'The code provenance control is not set'

        scanners: dict[str, Scanner] = {}
        url = policy.code_provenance.download_url

        for i in policy.code_provenance.datasets or []:
            scanner = Scanner.from_dataset_name(i['dataset'], url=url)
            scanners[i['language'].lower()] = scanner

        return cls(
            name=f'{policy.name} | {cls.policy_type}',
            add_footnotes=policy.code_provenance.add_footnotes,
            add_metadata=policy.code_provenance.add_metadata,
            fullscan=policy.code_provenance.fullscan,
            scanners=scanners,
        )

    def set_usage(self, ctx: Context, text: str):
        ctx.usage_policy_events.append(
            PolicyEvent(
                policy=self.policy_type,
                action='',
                priority=2,
                samples=[]
            )
        )


    @lru_cache(maxsize=512)
    def operate(self, text):
        return text

    def scan(self, content: str, language: str | None = ''):
        if not language:
            if self.fullscan:
                scanners = self.scanners.values()
            else:
                return []
        else:
            if scanner := self.scanners.get(language.lower()):
                scanners = [scanner]
            else:
                return []

        attributions: list[Attribution] = []

        for scanner in scanners:
            for snippet in scanner.scan(content):
                attributions.append(
                    Attribution(
                        url=snippet.source.github_permalink(),
                        licenses=snippet.source.licenses,
                    )
                )

                logger.info('Attribution found %r', snippet.source)

        return attributions

    async def on_completion(self, ctx: Context, body: ChatCompletionCreate):
        async def on_return(response: ModelResponse | Any):
            if isinstance(response, ModelResponse):
                for i in response.choices:
                    if not i.message.content:
                        continue

                    attributions: list[Attribution] = []
                    
                    if not self.fullscan:
                        blocks = self.fenced_code_pattern.findall(i.message.content)

                        for language, content in blocks:
                            attributions.extend(self.scan(content, language))

                        if self.add_footnotes and attributions:
                            i.message.content += '\n\nFound snippets in third-party repositories:\n\n'
                            i.message.content += build_footnote(attributions)
                    else:
                        attributions.extend(self.scan(i.message.content))

                    if self.add_metadata and attributions:
                        ctx.policy_responses.append(
                            {
                                'policy_type': self.policy_type,
                                'result': attributions,
                            }
                        )

            return response

        return on_return
