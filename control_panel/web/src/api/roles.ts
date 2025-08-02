import {
  Role,
  RoleRequest,
  RoleResponse,
  ScopePermissions,
} from "../types/roles";
import { userApi } from "./user";

const rolesApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    fetchRoles: build.query<RoleResponse[], void>({
      query: () => ({ url: `/api/rbac/roles/fetch` }),
      providesTags: ["roles"],
    }),
    getRole: build.query<RoleResponse, {id: string}>({
      query: ({id}: {id: string}) => ({ url: `/api/rbac/roles/get?id=${id}` }),
      providesTags: ["roles"],
    }),
    fetchDescriptivePermissions: build.query<ScopePermissions[], void>({
      query: () => ({ url: `/api/rbac/descriptive-permissions` }),
    }),
    createRole: build.mutation<Role, RoleRequest>({
      query: (body) => ({
        url: `/api/rbac/roles/create`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["roles"],
    }),
    updateRole: build.mutation<Role, Role>({
      query: (body) => ({
        url: `/api/rbac/roles/update?id=${body._id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["roles"],
    }),
    deleteRole: build.mutation<void, {id: string}>({
      query: (body) => ({
        url: `/api/rbac/roles/delete?id=${body.id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["roles"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useDeleteRoleMutation,
  useFetchRolesQuery,
  useFetchDescriptivePermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
} = rolesApi;
