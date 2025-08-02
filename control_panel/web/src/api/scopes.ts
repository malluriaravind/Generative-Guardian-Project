import { ScopeCheck } from "../types/scope";
import { userApi } from "./user";

const scopesApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    checkScope: build.mutation<ScopeCheck, {scopes: string[]}>({
      query: (body) => ({ url: `/api/scopes/check`, method: "POST", body }),
    }),
    fetchAvailableScopes: build.query<string[], void>({
        query: (body) => ({ url: `/api/scopes/available`, body }),
      }),
}),
    overrideExisting: false,
});

export const {
  useCheckScopeMutation,
  useFetchAvailableScopesQuery,
} = scopesApi;
