import { Version } from "../types/maintenance";
import authApi from "./auth";

const maintenanaceApi = authApi.injectEndpoints({
  endpoints: (build) => ({
    getVersions: build.query<Version[], void>({
      query: () => ({ url: `/api/maintenance/heartbeats` }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetVersionsQuery } = maintenanaceApi;
