import {
  Field,
  LogDescriptiveHttpCode,
  LogDuration,
  LogExportFormat,
  LogLevel,
  LogRetention,
  LogSettings,
  LogViewerRequest,
  LogViewerResponse,
  StatsTypes,
  WeeklyEmailConfig,
} from "../types/log_viewer";
import { userApi } from "./user";

const logViewerApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    fetchLogs: build.query<LogViewerResponse[], LogViewerRequest>({
      query: (arg) => ({ url: `/api/logs/fetch`, params: { ...arg } }),
      merge: (currentCacheData, responseData) => {
        currentCacheData.push(...responseData);
      },
      serializeQueryArgs: ({ queryArgs }) => queryArgs.id,
    }),
    fetchRRLogs: build.query<LogViewerResponse[], LogViewerRequest>({
      query: (arg) => ({ url: `/api/logs/reqres/fetch`, params: { ...arg } }),
      merge: (currentCacheData, responseData) => {
        currentCacheData.push(...responseData);
      },
      serializeQueryArgs: ({ queryArgs }) => queryArgs.id,
    }),
    getStatsCount: build.query<number, Partial<LogViewerRequest> & { type: StatsTypes }>(
      {
        query: (arg) => ({
          url: `/api/usage/count/${arg.type}`,
          params: { ...arg },
        }),
        transformResponse: ({count}: { count: number }) => count,
      }
    ),
    fetchReqResLogs: build.query<
      { raw_requests: object[]; raw_responses: object[] },
      LogViewerRequest
    >({
      query: (arg) => ({ url: "/api/logs/reqres", params: { ...arg } }),
    }),
    getDescriptiveLogLevels: build.query<LogLevel[], void>({
      query: () => ({ url: `/api/logs/descriptive-levels` }),
    }),
    getDescriptiveFields: build.query<Field[], void>({
      query: () => ({ url: `/api/logs/descriptive-fields` }),
    }),
    getDescriptiveQueryFields: build.query<{ [key: string]: string }, void>({
      query: () => ({ url: `/api/logs/descriptive-query-fields` }),
      transformResponse: (response: Field[]) =>
        response?.reduce(
          (acc, { name, title }) => ({ ...acc, [name]: title }),
          {}
        ),
    }),
    getDescriptiveLogDurations: build.query<LogDuration[], void>({
      query: () => ({ url: `/api/logs/descriptive-durations` }),
    }),
    getDescriptiveLogRetentions: build.query<LogRetention[], void>({
      query: () => ({ url: `/api/logs/descriptive-retentions` }),
    }),
    getDescriptiveLogExportFormats: build.query<LogExportFormat[], void>({
      query: () => ({ url: `/api/logs/descriptive-export-formats` }),
    }),
    getDescriptiveLogHttpCodes: build.query<LogDescriptiveHttpCode[], void>({
      query: () => ({ url: `/api/logs/descriptive-codes` }),
    }),
    getLogSettings: build.query<LogSettings, void>({
      query: () => ({ url: `/api/logs/settings/fetch` }),
      providesTags: ["log-viewer"],
    }),
    updateLogSettings: build.mutation<void, LogSettings>({
      query: (body) => ({
        url: `/api/logs/settings/update`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["log-viewer"],
    }),
    exportLogs: build.mutation<void, LogViewerRequest>({
      query: (params) => ({
        url: `/api/logs/export`,
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
    getWeeklyReportSettings: build.query<WeeklyEmailConfig, void>({
      query: () => ({ url: `/api/logs/weekly_report_config/fetch` }),
      providesTags: ["log-viewer"],
    }),
    updateWeeklyReportSettings: build.mutation<void, WeeklyEmailConfig>({
      query: (body) => ({
        url: `/api/logs/weekly_report_config/update`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["log-viewer"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useFetchLogsQuery,
  useLazyFetchRRLogsQuery,
  useLazyFetchLogsQuery,
  useGetDescriptiveFieldsQuery,
  useGetDescriptiveQueryFieldsQuery,
  useFetchReqResLogsQuery,
  useGetStatsCountQuery,
  useGetDescriptiveLogLevelsQuery,
  useGetDescriptiveLogDurationsQuery,
  useGetDescriptiveLogRetentionsQuery,
  useGetDescriptiveLogExportFormatsQuery,
  useGetDescriptiveLogHttpCodesQuery,
  useGetLogSettingsQuery,
  useUpdateLogSettingsMutation,
  useExportLogsMutation,
  useGetWeeklyReportSettingsQuery,
  useUpdateWeeklyReportSettingsMutation,
} = logViewerApi;
