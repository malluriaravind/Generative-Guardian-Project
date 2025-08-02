import {
  CodeProvencePolicy,
  CodeProvenceResponse,
} from "../../../types/policy/controls/code-provenance";
import { userApi } from "../../user";

const codeProvenanceApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    testAccessibility: build.query<{ message: string, error: string | null }, CodeProvencePolicy>({
      query: (body) => ({
        method: "POST",
        url: `/api/codeprov/connectivity-check`,
        body,
      }),
    }),
    getCodeProvenceDataset: build.query<CodeProvenceResponse[], void>({
      query: () => `/api/codeprov/datasets`,
    }),
    updateCodeProvencePolicy: build.mutation<void, CodeProvencePolicy>({
      query: (body) => ({
        method: "POST",
        url: `/api/codeprov/datasets`,
        body,
      }),
      invalidatesTags: ["code-provenance"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCodeProvenceDatasetQuery,
  useUpdateCodeProvencePolicyMutation,
  useLazyTestAccessibilityQuery,
} = codeProvenanceApi;
