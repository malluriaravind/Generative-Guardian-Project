import logging

from pydantic import BaseModel, Field
from beanie import PydanticObjectId, UpdateResponse
from control_panel.deps.auth import Auth, GetAuth, AcAPIRouter

from trussed.models import Unscoped
from trussed.models.rbac import Role, RoleCreate, RoleUpdate, RbacPermission
from trussed.errors import RoleAlreadyExistError
from trussed.models.user import User


logger = logging.getLogger(__name__)
router = AcAPIRouter(prefix='/rbac', tags=['RBAC'])


class DescriptivePermission(BaseModel):
    name: RbacPermission
    enabled: bool = False
    eligible: bool = False

    @classmethod
    def permmap(cls):
        return {
            'Create': cls(name='Create'),
            'Read': cls(name='Read'),
            'Update': cls(name='Update'),
            'Delete': cls(name='Delete'),
            'Global': cls(name='Global'),
        }


class DescriptiveNamespace(BaseModel):
    title: str
    namespace: str
    permissions: list[DescriptivePermission] = Field(default_factory=list)


known_namespaces = {i.namespace: i for i in [
    DescriptiveNamespace(namespace='/apikey/', title='Applications'),
    DescriptiveNamespace(namespace='/llm/', title='LLM - Providers'),
    DescriptiveNamespace(namespace='/modelpool/', title='LLM - Pools'),
    DescriptiveNamespace(namespace='/accounts/', title='Accounts'),
    DescriptiveNamespace(namespace='/rbac/', title='Accounts - RBAC'),
    DescriptiveNamespace(namespace='/policies/', title='Policies'),
    DescriptiveNamespace(namespace='/budget/', title='Budgets'),
    DescriptiveNamespace(namespace='/logs/', title='Audit & Logs'),
    DescriptiveNamespace(namespace='/cfg/', title='Configuration'),
    DescriptiveNamespace(namespace='/overview/', title='Overview'),
    DescriptiveNamespace(namespace='/stats/', title='Statistics'),
    DescriptiveNamespace(namespace='/alert/', title='Alerts'),
]}


@router.get('/descriptive-permissions')
async def permissions(role: str = '', auth: Auth = GetAuth()):
    is_root = auth.user.is_root
    role_mapping = {}
    auth_mapping = {}
    namespaces: list[DescriptiveNamespace] = []
    crudset = {*DescriptivePermission.permmap().keys()} - {'Global'}

    if role:
        if entry := await Role.find_one({'name': role}):
            role_mapping = Role.to_mapping(entry)

    if auth.rbac is not None:
        auth_mapping = auth.rbac.mapping

    for i in AcAPIRouter.get_consolidated_routes().values():
        if known := known_namespaces.get(i.namespace):
            title = known.title
        else:
            title = i.namespace.replace('/', ' ').strip().title()

        role_perms = role_mapping.get(i.namespace) or set()
        auth_perms = auth_mapping.get(i.namespace) or set()
        crudmap = DescriptivePermission.permmap()

        if not i.allow_global_permission_for:
            crudmap.pop('Global', None)
        
        for k in crudset - i.crud:
            crudmap.pop(k, None)

        for permission in crudmap.values():
            permission.enabled = permission.name in role_perms
            permission.eligible = is_root or permission.name in auth_perms

        namespaces.append(
            DescriptiveNamespace(
                title=title,
                namespace=i.namespace,
                permissions=[*crudmap.values()],
            )
        )

    return sorted(namespaces, key=lambda x: x.title)


@router.post('/roles/create')
async def create(new: RoleCreate, auth: Auth = GetAuth()):
    with Unscoped():
        if await Role.find_one({'name': new.name}):
            raise RoleAlreadyExistError(f'Role with name {new.name} already exists')

    if not auth.user.is_root:
        new.check_for_eligibility(auth.rbac)

    role = Role.model_validate(new, from_attributes=True)

    await role.insert()
    return role



@router.post('/roles/update')
async def upsert(id: PydanticObjectId, new: RoleUpdate, auth: Auth = GetAuth()):
    if new.name:
        with Unscoped():
            if old := await Role.find_one({'name': new.name}):
                if old.id != id:
                    raise RoleAlreadyExistError(f'Role with name {new.name} already exists')

    if old := await Role.find_one({'_id': id}):
        if not auth.user.is_root:
            new.check_for_eligibility(auth.rbac, old)

        # Renaming the role
        if new.name and old.name != new.name:
            with Unscoped():
                await User.find({'roles': old.name}).update_many(
                    {'$set': {'roles.$': new.name,}},
                )

        await Role.update_one_from(
            {'_id': id},
            new,
            response_type=UpdateResponse.UPDATE_RESULT,
        )

        return 1
    
    return 0


@router.post('/roles/delete')
async def delete(id: PydanticObjectId, auth: Auth = GetAuth()):
    if role := await Role.find_one({'_id': id}):
        if not auth.user.is_root:
            auth.rbac.check_for_permissions(role.permissions)

        with Unscoped():
            await User.find({'roles': role.name}).update_many(
                {'$pull': {'roles': role.name}},
            )

        await Role.find_one({'_id': id}).delete_one()
        return 1

    return 0


@router.get('/roles/fetch')
async def fetch(auth: Auth = GetAuth()) -> list[Role]:
    return await Role.find().sort('name').to_list()


@router.get('/roles/get')
async def get(id: PydanticObjectId, auth: Auth = GetAuth()) -> Role | None:
    return await Role.find_one({'_id': id})
