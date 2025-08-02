import logging

from typing import *
from beanie import PydanticObjectId, UpdateResponse
from fastapi import APIRouter

from trussed.models.policies import *

from ..config import env
from ..deps.auth import GetAuth, AcAPIRouter


log = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/policies', tags=['Policies'])
router.ac_allow_global_permission_for = {Policy}


class DescriptivePolicyType(BaseModel):
    name: str
    value: PolicyType
    disabled: bool = False


@router.get('/descriptive-controls', dependencies=[GetAuth()])
async def controls():
    log.info("Received request: GET /policies/descriptive-controls")
    disabled = not env.bool('ENABLE_SECURITY_POLICY_CONTROL', True)
    log.debug(f"ENABLE_SECURITY_POLICY_CONTROL set to {not disabled}")

    descriptive_controls = [
        DescriptivePolicyType(
            name='Detect non-printable invisible unicode characters',
            value='InvisibleText',
        ),
        DescriptivePolicyType(
            name='Identify and assess the authenticity of the language used in the prompts',
            value='Languages',
        ),
        DescriptivePolicyType(
            name='Detect attacks that attempt to overwrite system prompts',
            value='Injection',
            disabled=disabled,
        ),
        DescriptivePolicyType(
            name='Detect topics such as religion, violence',
            value='Topics',
            disabled=disabled,
        ),
        DescriptivePolicyType(
            name='PII (Personally identifiable information)',
            value='PII',
            disabled=disabled,
        ),
        DescriptivePolicyType(
            name='Code provenance and attribution',
            value='CodeProvenance',
            disabled=disabled,
        ),
    ]
    log.info(f"Returning {len(descriptive_controls)} descriptive controls")
    return descriptive_controls


def security_policy_control(dto: CreatePolicy | UpdatePolicy):
    log.debug("Entering security_policy_control")
    enable_control = env.bool('ENABLE_SECURITY_POLICY_CONTROL', True)
    log.debug(f"ENABLE_SECURITY_POLICY_CONTROL: {enable_control}")
    if enable_control or not dto.controls:
        log.debug("Security policy control is enabled or no controls to process")
        return True

    controls: tuple[PolicyType, ...] = ('PII', 'Injection', 'Topics')
    ok = True

    if dto.controls:
        log.debug(f"Processing controls: {dto.controls}")
        for i in dto.controls.copy():
            if i in controls:
                log.warning(f"Control '{i}' is restricted and will be removed")
                ok = False
                dto.controls.remove(i)

    log.debug(f"Security policy control result: {ok}")
    return ok


@router.post('/create', dependencies=[GetAuth()])
async def create(body: CreatePolicy) -> PolicyOut:
    log.info("Received request: POST /policies/create")
    log.debug(f"Payload: {body}")

    security_policy_control(body)

    policy = Policy.model_validate(body, from_attributes=True)
    await policy.insert()
    log.info(f"Policy created with ID: {policy.id}")
    return policy


@router.get('/get', dependencies=[GetAuth()])
async def get(id: PydanticObjectId) -> PolicyOut:
    log.info(f"Received request: GET /policies/get?id={id}")
    policy = await Policy.find_one(Policy.id == id)
    if policy:
        log.debug(f"Policy found: {policy}")
    else:
        log.warning(f"Policy with ID {id} not found")
    return policy


@router.post('/update', dependencies=[GetAuth()])
async def update(body: UpdatePolicy, id: PydanticObjectId) -> int:
    log.info(f"Received request: POST /policies/update?id={id}")
    log.debug(f"Payload: {body}")

    security_policy_control(body)

    policy = await Policy.update_one_from(
        Policy.id == id,
        body,
        response_type=UpdateResponse.NEW_DOCUMENT,
    )

    if policy:
        await policy.update_relations()
        log.info(f"Policy with ID {id} updated successfully")
        return 1

    log.warning(f"Policy with ID {id} not found for update")
    return 0


@router.post('/delete', dependencies=[GetAuth()])
async def delete(id: PydanticObjectId) -> int:
    log.info(f"Received request: POST /policies/delete?id={id}")
    policy = await Policy.find_one(Policy.id == id)
    if policy:
        await policy.delete_relations()
        await policy.delete()
        log.info(f"Policy with ID {id} deleted successfully")
        return 1

    log.warning(f"Policy with ID {id} not found for deletion")
    return 0


@router.get('/fetch', dependencies=[GetAuth()])
async def fetch() -> list[PolicyOut]:
    log.info("Received request: GET /policies/fetch")
    find = Policy.find().sort(-Policy.created_at)
    policies = await find.to_list()
    log.info(f"Fetched {len(policies)} policies")
    return policies
