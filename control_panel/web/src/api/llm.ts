import {
  LlmCreateRequest,
  LlmResponse,
  LlmUpdateRequest,
} from "../types/llm";
import { Azure, Bedrock, OpenAI, Tokenizer } from "../types/providers";
import { userApi } from "./user";

const llmApi = userApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchLlm: builder.query<LlmResponse[], void>({
      query: () => ({ url: "/api/llm/fetch" }),
      providesTags: ["llm"],
    }),
    getLlm: builder.query<LlmResponse, { id: string; allmodels: boolean }>({
      query: ({ allmodels, id }) => ({
        url: `/api/llm/get?id=${id}&allmodels=${allmodels}`,
      }),
      providesTags: ["llm"],
    }),
    testLlm: builder.mutation<void, { provider: string, id: string } & (Azure | OpenAI | Bedrock)>({
      query: (body) => ({
        url: `/api/llm/pricelist` + (!body.id ? `` : `?id=${body.id}`),
        method: "POST",
        body
      }),
    }),
    testLlmConnection: builder.mutation<void, { id: string }>({
      query: (body) => ({
        url: `/api/llm/test?id=${body.id}`,
        method: 'POST',
      }),
      invalidatesTags: ["llm"],
    }),
    createLlm: builder.mutation<LlmResponse, LlmCreateRequest>({
      query: (body) => ({
        url: "/api/llm/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["llm"],
    }),
    updateLlm: builder.mutation<void, LlmUpdateRequest>({
      query: (body) => ({
        url: `/api/llm/update?id=${body._id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["llm"],
    }),
    enableLlm: builder.mutation<void, { id: string }>({
      query: (body) => ({
        url: `/api/llm/enable?id=${body.id}`,
        method: "POST",
      }),
      invalidatesTags: ["llm"],
    }),
    disableLlm: builder.mutation<void, { id: string }>({
      query: (body) => ({
        url: `/api/llm/disable?id=${body.id}`,
        method: "POST",
      }),
      invalidatesTags: ["llm"],
    }),
    deleteLlm: builder.mutation<void, { id: string }>({
      query: (body) => ({
        url: `/api/llm/delete?id=${body.id}`,
        method: "POST",
      }),
      invalidatesTags: ["llm"],
    }),
    getProviders: builder.query<string[], void>({
      query: () => ({ url: '/api/llm/providers' })
    }),
    getDescriptiveProviders: builder.query<{ name: string, value: string }[], void>({
      query: () => ({ url: '/api/llm/descriptive-providers' })
    }),
    getDescriptiveTokenizers: builder.query<Tokenizer[], { provider: string }>({
      query: ({ provider }) => ({ url: `/api/llm/descriptive-tokenizers?provider=${provider}` })
    })
  }),
  overrideExisting: false,
});

export const {
  useGetProvidersQuery,
  useGetDescriptiveProvidersQuery,
  useGetDescriptiveTokenizersQuery,
  useGetLlmQuery,
  useFetchLlmQuery,
  useDisableLlmMutation,
  useEnableLlmMutation,
  useTestLlmMutation,
  useTestLlmConnectionMutation,
  useCreateLlmMutation,
  useUpdateLlmMutation,
  useDeleteLlmMutation,
} = llmApi;
