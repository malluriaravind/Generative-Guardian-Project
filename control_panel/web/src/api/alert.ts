import {
  AlertResponse,
  AlertCreateRequest,
  AlertUpdateRequest,
  AlertGraph,
} from "../types/alert";
import { Watch } from "../types/watch";
import { userApi } from "./user";

const alertApi = userApi.injectEndpoints({
  endpoints: (builder) => ({
    getAlert: builder.query<AlertResponse, { id: string }>({
      query: ({ id }) => ({ url: `/api/alert/get?id=${id}` }),
    }),
    fetchAlerts: builder.query<AlertResponse[], void>({
      query: () => ({ url: "/api/alert/fetch" }),
      providesTags: ["alert"],
    }),
    getAppAndModels: builder.query<Watch[], void>({
      query: () => ({ url: "/api/alert/watch-objects" }),
    }),
    getPeriods: builder.query<string[], void>({
      query: () => ({ url: "/api/alert/watch-periods" }),
    }),
    getTimezones: builder.query<string[], void>({
      query: () => ({ url: "/api/alert/timezones" }),
    }),
    createAlert: builder.mutation<AlertResponse, AlertCreateRequest>({
      query: (body) => ({ url: "/api/alert/create", method: "POST", body }),
      invalidatesTags: ["alert"],
    }),
    deleteAlert: builder.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/api/alert/delete?id=${id}`,
        method: "POST",
      }),
      invalidatesTags: ["alert"],
    }),
    updateAlert: builder.mutation<void, AlertUpdateRequest>({
      query: (body) => ({
        url: `/api/alert/update?id=${body.id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["alert"],
    }),
    getAlertStats: builder.query<AlertGraph[], { id: string }>({
      query: ({ id }) => ({
        url: `/api/stats/alert?id=${id}`,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAlertQuery,
  useFetchAlertsQuery,
  useGetAppAndModelsQuery,
  useGetTimezonesQuery,
  useGetPeriodsQuery,
  useGetAlertStatsQuery,
  useCreateAlertMutation,
  useUpdateAlertMutation,
  useDeleteAlertMutation,
} = alertApi;
