export type Permission = {
  namespace: string;
  permissions: string[];
};

export type Role = {
  _id?: string;
  name: string;
  comment?: string;
  created_at?: Date;
  assigned_scopes?: string[];
  permissions: Permission[];
};

export type RoleResponse = Role;
export type RoleRequest = Omit<Role, "_id">;

export interface PermissionItem {
  name: string;
  enabled: boolean;
  eligible: boolean;
}

export interface ScopePermissions {
  title: string;
  namespace: string;
  permissions: PermissionItem[];
}
