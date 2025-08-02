import { Issue } from "../components/shared/components/information-blocks-list";
import { userApi } from "./user";

const overviewApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    getComplianceIssues: build.query<Issue[], void>({
      query: () =>
        `/api/overview/policies`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetComplianceIssuesQuery
} = overviewApi;
