from typing import *

from functools import cached_property
from datetime import datetime
from beanie import PydanticObjectId
from pydantic import Field, BaseModel, AfterValidator, model_validator, computed_field
from pymongo import IndexModel

from ..pydantic import custom_validation_error
from ..spacy.repr import model_to_reprname, reprname_to_model
from ..utils.inflection import underscore

from .piibase import predefined_pii_entities
from .apikey import Apikey
from . import AppDocument, BaseCreateModel, BaseUpdateModel, Unscoped


PolicyType = Literal[
    'InvisibleText',
    'Languages',
    'Injection',
    'Topics',
    'PII',
    'CodeProvenance'
]

InvisibleTextAction = Literal[
    'Sanitization',
    'Ban',
]
LanguageAction = Literal[
    'Disabled',
    'Sanitization',
    'CustomResponse',
    'Ban',
]
InjectionAction = Literal[
    'Disabled',
    'Sanitization',
    'CustomResponse',
    'Ban',
]
TopicsAction = Literal[
    'Disabled',
    'CustomResponse',
    'Ban',
]
PiiAction = Literal[
    'Redaction',
    'Tokenization',
    'Anonymization',
]
CodeProvenanceAction = Literal[
    'AddFootnotes',
    'AddMetadata',
]


class PiiModel(TypedDict, total=False):
    model: Required[str]
    version: Required[str]
    lang: str


class PiiEntity(TypedDict, total=False):
    entity: Required[str]
    entity_id: PydanticObjectId | None


class PiiPolicy(BaseModel):
    action: PiiAction
    models: list[PiiModel]
    entities: list[PiiEntity]
    redaction_character: str = '*'


def validate_pii_entity(i: PiiEntity):
    if i['entity'] not in predefined_pii_entities:
        if not i.get('entity_id'):
            raise ValueError('entity_id is missing for a custom entity')

    return i


class ValidatedPiiPolicy(PiiPolicy):
    entities: list[Annotated[PiiEntity, AfterValidator(validate_pii_entity)]]


class InvisibleTextPolicy(BaseModel):
    action: InvisibleTextAction


class LanguagesPolicy(BaseModel):
    action: LanguageAction = 'Disabled'
    allowed_languages: list[str] | None = None
    custom_message: str | None = None


class PromptInjectionPolicy(BaseModel):
    action: InjectionAction = 'Disabled'
    threshold: float = 0.5
    custom_message: str | None = None


class TopicSpec(BaseModel):
    topic: str
    action: TopicsAction | None = None
    threshold: float = 0.5
    custom_message: str | None = None


class TopicsPolicy(BaseModel):
    action: TopicsAction = 'Disabled'
    ban_topics: list[TopicSpec] | None = None
    custom_message: str | None = None


class JailbreakPolicy(BaseModel):
    languages: LanguagesPolicy | None = None
    injection: PromptInjectionPolicy | None = None
    topics: TopicsPolicy | None = None


class CodeProvenanceDataset(TypedDict):
    name: str
    language: str
    dataset: str
    disabled: bool


class CodeProvenancePolicy(BaseModel):
    fullscan: bool = False
    add_footnotes: bool = True
    add_metadata: bool = True
    datasets: list[CodeProvenanceDataset] | None = None
    download_url: str | None = None


class Policy(AppDocument):
    scoped_context_enable: ClassVar[bool] = True

    controls: list[PolicyType]
    name: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    apply_to_responses: bool = False

    invisible_text: InvisibleTextPolicy | None = None
    # jailbreak: JailbreakPolicy | None = None
    languages: LanguagesPolicy | None = None
    injection: PromptInjectionPolicy | None = None
    topics: TopicsPolicy | None = None
    pii: PiiPolicy | None = None
    code_provenance: CodeProvenancePolicy | None = None

    class Settings:
        indexes = [
            IndexModel(['scopes']),
            IndexModel(['created_at']),
        ]

    @Unscoped()
    async def update_relations(self):
        update = {
            '$set': {'updated_at': datetime.utcnow()},
        }
        await Apikey.find(Apikey.policies == self.id).update(update)

    @Unscoped()
    async def delete_relations(self):
        update = {
            '$set': {'updated_at': datetime.utcnow()},
            '$pull': {'policies': self.id},
        }
        await Apikey.find(Apikey.policies == self.id).update(update)


class PolicyOut(Policy):
    @model_validator(mode='after')
    def transform(self):
        if pii := self.pii:
            for i in pii.models:
                i['model'] = model_to_reprname(i['model'])

        return self


class CreatePolicy(BaseCreateModel):
    controls: list[PolicyType] = Field(min_items=1)
    name: str
    apply_to_responses: bool = False
    invisible_text: InvisibleTextPolicy | None = None
    languages: LanguagesPolicy | None = None
    injection: PromptInjectionPolicy | None = None
    topics: TopicsPolicy | None = None
    pii: ValidatedPiiPolicy | None = None
    code_provenance: CodeProvenancePolicy | None = None

    @computed_field
    @cached_property
    def created_at(self) -> datetime:
        return datetime.utcnow()

    @model_validator(mode='after')
    def valdate_after(self):
        validate_policy_data(self, required=True)
        return self


class UpdatePolicy(BaseUpdateModel):
    controls: list[PolicyType] | None = Field(min_items=1, default=None)
    name: str | None = None
    apply_to_responses: bool | None = None
    invisible_text: InvisibleTextPolicy | None = None
    languages: LanguagesPolicy | None = None
    injection: PromptInjectionPolicy | None = None
    topics: TopicsPolicy | None = None
    pii: ValidatedPiiPolicy | None = None
    code_provenance: CodeProvenancePolicy | None = None

    @model_validator(mode='after')
    def valdate_after(self):
        validate_policy_data(self, required=False)
        return self


def validate_policy_data(policy: Policy, *, required: bool):
    for i in policy.controls:
        options_field = underscore(i)
        options = getattr(policy, options_field, None)

        if required and not options:
            raise custom_validation_error(
                type(policy).__name__,
                'missing',
                f'{i} policy requires `{options_field}` options object',
                (options_field,),
            )

    if pii := policy.pii:
        for i in pii.models:
            i['model'] = reprname_to_model(i['model'])
            i['lang'] = i['model'].split('_', 1)[0]
