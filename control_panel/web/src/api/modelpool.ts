import { ModelPoolCreateRequest, ModelPoolResponse, ModelPoolUpdateRequest, Model } from "../types/modelpool";
import { userApi } from "./user";

const modelPoolApi = userApi.injectEndpoints({
    endpoints: (builder) => ({
        fetchAvailableModels: builder.query<Model[], void>({
            query: () => `/api/modelpool/available-models`
        }),
        fetchModelPools: builder.query<ModelPoolResponse[], void>({
            query: () => `/api/modelpool/fetch`,
            providesTags: ['modelpool'],
        }),
        createModelPool: builder.mutation<ModelPoolResponse, ModelPoolCreateRequest>({
            query: (body) => ({ url: '/api/modelpool/create', body, method: 'POST' }),
            invalidatesTags: ['modelpool']
        }),
        updateModelPool: builder.mutation<number, ModelPoolUpdateRequest>({
            query: (body) => ({ url: `/api/modelpool/update?id=${body.id}`, body, method: 'POST' }),
            invalidatesTags: ['modelpool']
        }),
        deleteModelPool: builder.mutation<number, { id: string }>({
            query: ({ id }) => ({ url: `/api/modelpool/delete?id=${id}`, method: 'POST' }),
            invalidatesTags: ['modelpool']
        })
    }),
    overrideExisting: false,
});

export const {
    useFetchAvailableModelsQuery,
    useFetchModelPoolsQuery,
    useCreateModelPoolMutation,
    useUpdateModelPoolMutation,
    useDeleteModelPoolMutation } = modelPoolApi;