import {
  ApiKeyCreateRequest,
  ApiKeyResponse,
  ApiKeyUpdateRequest,
} from "../types/apikey";
import { userApi } from "./user";

const apiKeyApi = userApi.injectEndpoints({
  endpoints: (builder) => ({
    getApiKeys: builder.query<ApiKeyResponse[], void>({
      query: () => ({ url: "/api/apikey/fetch" }),
      providesTags: ["apikey"],
    }),
    createApiKey: builder.mutation<ApiKeyResponse, ApiKeyCreateRequest>({
      query: (body) => ({
        url: "/api/apikey/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["apikey"],
    }),
    updateApiKey: builder.mutation<void, ApiKeyUpdateRequest>({
      query: (body) => ({
        url: `/api/apikey/update?id=${body.id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["apikey"],
    }),
    deleteApiKey: builder.mutation<void, { id: string }>({
      query: (body) => ({
        url: `/api/apikey/delete?id=${body.id}`,
        method: "POST",
      }),
      invalidatesTags: ["apikey"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetApiKeysQuery,
  useCreateApiKeyMutation,
  useUpdateApiKeyMutation,
  useDeleteApiKeyMutation,
} = apiKeyApi;
