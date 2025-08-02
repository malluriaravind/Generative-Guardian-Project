import { CreatePolicyRequest, PolicyControlsResponse, PolicyReponse, PolicyResponseItem, UpdatePolicyRequest } from '../../types/policy';
import { userApi } from "../user";

const policyApi = userApi.injectEndpoints({
    endpoints: (build) => ({
        getPolicyControls: build.query<PolicyControlsResponse, void>({
            query: () => `/api/policies/descriptive-controls`,
        }),
        getPolicies: build.query<PolicyReponse, void>({
            query: () => `/api/policies/fetch`,
            providesTags: ['policy'],
        }),
        getPolicy: build.query<PolicyResponseItem, { id: string }>({
            query: ({ id }) => `/api/policies/get?id=${id}`,
            providesTags: ['policy'],
        }),
        deletePolicy: build.mutation<void, { id: string }>({
            query: ({ id }) => ({
                method: 'POST',
                url: `/api/policies/delete?id=${id}`,
            }),
            invalidatesTags: ['policy'],
        }),
        updatePolicy: build.mutation<void, UpdatePolicyRequest>({
            query: (body) => ({
                method: 'POST',
                url: `/api/policies/update?id=${body.id}`,
                body
            }),
            invalidatesTags: ['policy'],
        }),

        createPolicy: build.mutation<void, CreatePolicyRequest>({
            query: (body) => ({
                method: 'POST',
                url: `/api/policies/create`,
                body
            }),
            invalidatesTags: ['policy'],
        }),


    }),
    overrideExisting: false
});

export const { 
    useGetPoliciesQuery,
    useUpdatePolicyMutation,
    useCreatePolicyMutation,
    useDeletePolicyMutation,
    useGetPolicyQuery,
    useGetPolicyControlsQuery,
 } = policyApi;
