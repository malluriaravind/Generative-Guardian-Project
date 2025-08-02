import { TriggeredResponse } from "../types/triggered";
import { userApi } from "./user";

const triggeredApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    fetchTriggeredAlerts: build.query<TriggeredResponse[], void>({
      query: () => ({ url: "/api/alert/triggered/fetch" }),
      providesTags: ["trigger"],
    }),
    uncheckedCountTriggered: build.query<number, void>({
      query: () => ({ url: "/api/alert/triggered/unchecked-count" }),
      providesTags: ["trigger"],
      extraOptions: { namespace: '/alert/' },
    }),
    checkTrigger: build.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/api/alert/triggered/check?id=${id}`,
        method: "POST",
      }),
      invalidatesTags: ["trigger"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFetchTriggeredAlertsQuery,
  useUncheckedCountTriggeredQuery,
  useCheckTriggerMutation,
} = triggeredApi;
