import {
  BaseQueryFn,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { API_DOMAIN } from "../constants";
import { RootState } from "../store";
import {
  PasswordChangeRequest,
  Profile,
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from "../types/user";
import { Account } from "../types/account";

const customBaseQuery: BaseQueryFn<any, unknown, unknown> = async (
  args,
  api,
  extraOptions,
) => {
  const {
    user: { available_api_namespaces, is_root },
  } = api.getState() as RootState;

  if (
    !is_root &&
    extraOptions &&
    extraOptions.namespace &&
    available_api_namespaces &&
    available_api_namespaces.indexOf(extraOptions.namespace) < 0
  ) {
    return { data: undefined };
  }

  return await fetchBaseQuery({
    baseUrl: API_DOMAIN,
    prepareHeaders(headers, { getState }) {
      const token = (getState() as RootState).user.accessToken;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set(
        "x-timezone",
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    },
  })(args, api, extraOptions);
};

export const userApi = createApi({
  reducerPath: "userApi",
  refetchOnMountOrArgChange: true,
  tagTypes: [
    "profile",
    "account",
    "llm",
    "apikey",
    "alert",
    "trigger",
    "budget",
    "modelpool",
    "policy",
    "policy-pii",
    "configuration",
    "tokens",
    "log-viewer",
    "code-provenance",
    "roles",
  ],
  baseQuery: customBaseQuery,
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => ({ url: "/api/me" }),
    }),
    applyProfileInfo: builder.mutation<Profile, void>({
      query: () => ({ url: "/api/settings/profile", method: "GET" }),
      transformResponse: ({
        first_name,
        last_name,
        email,
        available_api_namespaces,
        is_root,
      }: {
        first_name: string;
        last_name: string;
        email: string;
        available_api_namespaces: string[];
        is_root: boolean;
      }) => {
        return {
          firstName: first_name,
          lastName: last_name,
          email,
          available_api_namespaces,
          is_root,
        };
      },
    }),
    changeProfileInfo: builder.mutation<void, Profile>({
      query: (body: Profile) => ({
        url: "/api/settings/change-profile-info",
        method: "POST",
        body: {
          first_name: body.firstName,
          last_name: body.lastName,
          email: body.email,
        },
      }),
      invalidatesTags: ["profile"],
    }),
    changePassword: builder.mutation<void, PasswordChangeRequest>({
      query: (body: PasswordChangeRequest) => ({
        url: "/api/settings/change-password",
        method: "POST",
        body,
      }),
      invalidatesTags: ["profile"],
    }),

    createAccount: builder.mutation<void, UserCreateRequest>({
      query: (body: UserCreateRequest) => ({
        url: "/api/accounts/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["account"],
    }),
    updateAccount: builder.mutation<void, UserUpdateRequest>({
      query: (body: UserUpdateRequest) => ({
        url: "/api/accounts/update",
        method: "POST",
        body,
      }),
      invalidatesTags: ["account"],
    }),
    changeAccountPassword: builder.mutation<
      void,
      { email: string; newPassword: string }
    >({
      query: (body) => ({
        url: "/api/accounts/change-password",
        method: "POST",
        body,
      }),
      invalidatesTags: ["account"],
    }),
    deleteAccount: builder.mutation<void, { email: string }>({
      query: (body) => ({
        url: "/api/accounts/delete",
        method: "POST",
        body,
      }),
      invalidatesTags: ["account"],
    }),
    fetchAccounts: builder.query<Account[], void>({
      query: () => ({
        url: "/api/accounts/fetch",
        method: "GET",
      }),
      providesTags: ["account"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useApplyProfileInfoMutation,
  useChangeProfileInfoMutation,
  useChangePasswordMutation,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useFetchAccountsQuery,
  useChangeAccountPasswordMutation,
} = userApi;
