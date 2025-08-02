import { UpdatePiiRequest, CreatePiiRequest, PiiDescriptiveAction, PiiModelResponse, PiiEntity, PiiResponse } from '../../../types/policy/controls/pii';
import { userApi } from "../../user";

const piiControlApi = userApi.injectEndpoints({
    endpoints: (build) => ({
        getPiiDescriptiveActions: build.query<PiiDescriptiveAction[], void>({
            query: () => `/api/pii/descriptive-actions`,
        }),
        getPiiModels: build.query<PiiModelResponse[], void>({
            query: () => `/api/pii/models`,
        }),
        getPiiEntities: build.query<PiiEntity[], void>({
            query: () => `/api/pii/entities`,
            providesTags: ['policy-pii'],
        }),
        getPiiCustomEntities: build.query<PiiResponse[], void>({
            query: () => `/api/pii/entities/custom/fetch`,
            providesTags: ['policy-pii'],
        }),
        deletePiiControl: build.mutation<number, { id: string }>({
            query: (body) => ({
                method: 'POST',
                url: `/api/pii/entities/custom/delete?id=${body.id}`
            }),
            invalidatesTags: ['policy-pii'],
        }),
        updatePiiControl: build.mutation<number, UpdatePiiRequest>({
            query: (body) => ({
                method: 'POST',
                url: `/api/pii/entities/custom/update`,
                body
            }),
            invalidatesTags: ['policy-pii'],
        }),

        createPiiControl: build.mutation<PiiResponse, CreatePiiRequest>({
            query: (body) => ({
                method: 'POST',
                url: `/api/pii/entities/custom/create`,
                body
            }),
            invalidatesTags: ['policy-pii'],
        }),

        getParentEntities: build.query<PiiResponse[], void>({
            query: () => `/api/pii/entities/model`,
        }),

    }),
    overrideExisting: false
});

export const { 
    useGetPiiEntitiesQuery, 
    useGetPiiDescriptiveActionsQuery, 
    useGetPiiModelsQuery,
    useCreatePiiControlMutation, 
    useGetPiiCustomEntitiesQuery,
    useDeletePiiControlMutation,
    useGetParentEntitiesQuery,
} = piiControlApi;
