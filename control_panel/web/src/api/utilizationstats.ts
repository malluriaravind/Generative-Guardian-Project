import { buildQueryParamsString } from "../helpers";
import { Stats, TotalStats } from "../types/stats";
import {
  AggregateRequest,
  StatsLineGraph,
  UtilizationBaseRequest,
} from "../types/utilization";
import { userApi } from "./user";

type Entity = { _id: string; name: string };

const statsApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    getAppList: build.query<
      Entity[],
      {
        begin: string | null;
        end: string | null;
        tag: string | null;
        llm: string | null;
      }
    >({
      query: (request) =>
        `/api/utilization/apps${buildQueryParamsString(request)}`,
    }),
    getProviderList: build.query<
      Entity[],
      {
        begin: string | null;
        end: string | null;
        tag: string | null;
        app: string | null;
      }
    >({
      query: (request) =>
        `/api/utilization/llms${buildQueryParamsString(request)}`,
    }),
    getUtilizationTags: build.query<
      string[],
      {
        begin: string | null;
        end: string | null;
        llm: string | null;
        app: string | null;
      }
    >({
      query: (request) => ({
        url: `/api/utilization/tags${buildQueryParamsString(request)}`,
      }),
    }),
    getUtilizationStats: build.query<Stats[], UtilizationBaseRequest>({
      query: (request) => ({
        url: `/api/utilization/errors${buildQueryParamsString(request)}`,
        method: "GET",
      }),
    }),
    getUtilizationModelStats: build.query<
      Stats[],
      { begin: string | null; end: string | null }
    >({
      query: (request) => ({
        url: `/api/utilization/models${buildQueryParamsString(request)}`,
      }),
    }),
    getUtilizationModelStatsTime: build.query<
      StatsLineGraph[],
      AggregateRequest
    >({
      query: (request) => {
        const { dateFrame, ...rest } = request;
        return {
          url: `/api/utilization/aggregate/${dateFrame}/${buildQueryParamsString(
            rest
          )}`,
          method: "GET",
        };
      },
    }),
    getUtilizationTotalStats: build.query<TotalStats, UtilizationBaseRequest>({
      query: (request) => ({
        url: `/api/utilization/total${buildQueryParamsString(request)}`,
      }),
    }),
    getUtilizationPoolStats: build.query<
      Stats[],
      { begin: string | null; end: string | null }
    >({
      query: (request) => ({
        url: `/api/utilization/pools${buildQueryParamsString(request)}`,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAppListQuery,
  useGetProviderListQuery,
  useGetUtilizationTotalStatsQuery,
  useGetUtilizationStatsQuery,
  useGetUtilizationModelStatsTimeQuery,
  useGetUtilizationModelStatsQuery,
  useGetUtilizationPoolStatsQuery,
  useGetUtilizationTagsQuery,
} = statsApi;
