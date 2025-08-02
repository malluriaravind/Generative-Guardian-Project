
import logging

from typing import Annotated, Iterable, Literal, Self, override
from datetime import datetime, UTC
from dataclasses import dataclass, field
from bisect import bisect

from pydantic import BaseModel, Field, AfterValidator, ConfigDict
from pymongo import IndexModel

from . import AppDocument, Unscoped
from .user import User
from ..errors import InvalidScopesError, InvalidPermissionsError


log = logging.getLogger(__name__)


RbacPermission = Literal[
    'Create',
    'Read',
    'Update',
    'Delete',
    'Global',
]


class RbacNamespace(BaseModel):
    model_config = ConfigDict(frozen=True)

    namespace: str
    permissions: tuple[RbacPermission | str, ...]


def NormalizeScope():
    def slashify(x: str):
        return f"/{'/'.join(filter(None, x.split('/')))}/"

    return AfterValidator(slashify)


ScopePath = Annotated[str, NormalizeScope()]


class Role(AppDocument):
    name: str
    comment: str = ''
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    assigned_scopes: list[str] = Field(default_factory=list)
    permissions: list[RbacNamespace] = Field(default_factory=list)

    class Settings:
        indexes = [
            IndexModel('name'),
            IndexModel('created_at'),
        ]

    @classmethod
    def to_mapping(cls, *roles: Self) -> dict[str, set[str]]:
        mapping: dict[str, set[str]] = {}

        for role in roles:
            for ns in role.permissions:
                mapping.setdefault(ns.namespace, set()).update(ns.permissions)

        return mapping

    def upsert(self):
        return self.find_one({'name': self.name}).upsert(
            {
                '$set': {
                    'name': self.name,
                    'comment': self.comment,
                    'scopes': self.scopes,
                    'permissions': self.permissions,
                },
            },
            on_insert=self,
        )

    @override
    @classmethod
    async def post_init(cls):
        with Unscoped(cls):
            if not await cls.count():
                for role in default_roles():
                    log.warning('Creating default role: %s', role.name)
                    await role.save()


class RoleCreate(BaseModel):
    name: str
    comment: str = ''
    assigned_scopes: list[ScopePath] = Field(default_factory=list)
    permissions: list[RbacNamespace] = Field(default_factory=list)

    def check_for_eligibility(self, rbac: 'RBAC'):
        rbac.check_for_scopes(self.assigned_scopes)
        rbac.check_for_permissions(self.permissions)


class RoleUpdate(BaseModel):
    name: str | None = None
    comment: str | None = None
    assigned_scopes: list[ScopePath] | None = None
    permissions: list[RbacNamespace] | None = None

    def check_for_eligibility(self, rbac: 'RBAC', old: Role):
        if self.assigned_scopes is not None:
            touched_scopes = set(old.assigned_scopes) ^ set(self.assigned_scopes)
            rbac.check_for_scopes(touched_scopes)

        if self.permissions is not None:
            touched_permissions = set(old.permissions) ^ set(self.permissions)
            rbac.check_for_permissions(touched_permissions)



@dataclass(slots=True)
class RBAC:
    is_root: bool = False
    roles: list[Role] = field(default_factory=list)
    mapping: dict[str, set[str]] = field(default_factory=dict)
    scopes: list[str] = field(default_factory=list)

    @classmethod
    async def from_user(cls, user: User):
        roles = await Role.find({'name': {'$in': user.roles or []}}).to_list()
        return cls.from_args(user, roles)

    @classmethod
    def from_args(cls, user: User, roles: list[Role]):
        mapping = Role.to_mapping(*roles)
        scopes = [scope for role in roles for scope in role.assigned_scopes]

        if user.available_scopes:
            scopes += user.available_scopes

        return cls(
            is_root=user.is_root,
            roles=roles,
            mapping=mapping,
            scopes=[*{*scopes}],  # Remove duplicates
        )

    def check_for_scopes(self, scopes: Iterable[str]):
        if self.is_root:
            return

        allowed_scopes = sorted(self.scopes)
        denied_scopes = []

        for scope in scopes:
            index = bisect(allowed_scopes, scope)

            if not index or not scope.startswith(allowed_scopes[index - 1]):
                denied_scopes.append(scope)
        
        if denied_scopes:
            raise InvalidScopesError(
                f'You do not have enough access on scope(s): {", ".join(denied_scopes)}',
                denied_scopes=denied_scopes,
            )

    def check_for_permissions(self, permissions: Iterable[RbacNamespace]):
        if self.is_root:
            return

        denied_namespaces = []

        for i in permissions:
            allowed_permissions = self.mapping.get(i.namespace) or set()

            if not allowed_permissions.issuperset(i.permissions):
                denied_namespaces.append(i.namespace)

        if denied_namespaces:
            raise InvalidPermissionsError(
                f'You do not have enough access on namespace(s): {", ".join(denied_namespaces)}',
                denied_namespaces=denied_namespaces,
            )


def default_roles():
    return [
        Role(
            name='ACO',
            comment='Audit & Compliance Officer',
            assigned_scopes=[],
            permissions=[
                RbacNamespace(namespace='/logs/', permissions=('Read', 'Global')),
                RbacNamespace(namespace='/stats/', permissions=('Read', 'Global')),
            ],
        ),
        Role(
            name='ATO',
            comment='App Team Owner',
            assigned_scopes=['/ato/'],
            permissions=[
                RbacNamespace(namespace='/alert/', permissions=('Read',)),
                RbacNamespace(namespace='/apikey/', permissions=('Read', 'Update')),
                RbacNamespace(namespace='/budget/', permissions=('Read', 'Update')),
                RbacNamespace(namespace='/modelpool/', permissions=('Read',)),
                RbacNamespace(namespace='/llm/', permissions=('Read',)),
                RbacNamespace(namespace='/overview/', permissions=('Read',)),
                RbacNamespace(namespace='/policies/', permissions=('Read',)),
                RbacNamespace(namespace='/stats/', permissions=('Read',)),
            ],
        ),
        Role(
            name='TCA',
            comment='Trussed Controller Admin',
            assigned_scopes=[],
            permissions=[
                RbacNamespace(
                    namespace='/accounts/',
                    permissions=('Create', 'Read', 'Update', 'Delete', 'Global'),
                ),
                RbacNamespace(
                    namespace='/rbac/',
                    permissions=('Create', 'Read', 'Update', 'Delete'),
                ),
                RbacNamespace(
                    namespace='/alert/',
                    permissions=('Create', 'Read', 'Update', 'Delete', 'Global'),
                ),
                RbacNamespace(
                    namespace='/apikey/',
                    permissions=('Create', 'Read', 'Update', 'Delete', 'Global'),
                ),
                RbacNamespace(
                    namespace='/logs/',
                    permissions=('Read', 'Update', 'Global'),
                ),
                RbacNamespace(
                    namespace='/budget/',
                    permissions=('Create', 'Read', 'Update', 'Delete', 'Global'),
                ),
                RbacNamespace(
                    namespace='/cfg/',
                    permissions=('Read', 'Update'),
                ),
                RbacNamespace(
                    namespace='/modelpool/',
                    permissions=('Create', 'Read', 'Update', 'Delete', 'Global'),
                ),
                RbacNamespace(
                    namespace='/llm/',
                    permissions=('Create', 'Read', 'Update', 'Delete', 'Global'),
                ),
                RbacNamespace(
                    namespace='/overview/',
                    permissions=('Read', 'Global'),
                ),
                RbacNamespace(
                    namespace='/policies/',
                    permissions=('Create', 'Read', 'Update', 'Delete', 'Global'),
                ),
                RbacNamespace(
                    namespace='/stats/',
                    permissions=('Read', 'Global'),
                ),
            ],
        ),
    ]