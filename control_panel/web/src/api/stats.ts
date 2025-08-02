import { buildQueryParamsString } from "../helpers";
import { Stats, StatsGraph, StatsType, TotalStats } from "../types/stats";
import { userApi } from "./user";

const statsApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    getStats: build.query<
      Stats[],
      {
        type: StatsType;
        begin: string | null;
        end: string | null;
        tag: string | null;
      }
    >({
      query: (request) => {
        const { type, ...rest } = request;
        return {
          url: `/api/usage/${type}${buildQueryParamsString(rest)}`,
        };
      },
    }),
    getModelStats: build.query<
      Stats[],
      { type: StatsType; id: string; begin: string | null; end: string | null }
    >({
      query: ({ id, type, begin, end }) => ({
        url:
          `/api/usage/model?${type}=${id}` +
          (begin && end ? `&begin=${begin}&end=${end}` : ""),
      }),
    }),
    getModelStatsTime: build.query<
      StatsGraph,
      {
        type: StatsType;
        dateFrame: "month" | "day";
        begin: string | null;
        end: string | null;
        tag: string | null;
      }
    >({
      query: (request) => {
        const { dateFrame, type, ...rest } = request;
        return {
          url: `/api/usage/stacked/${dateFrame}/${type}${buildQueryParamsString(
            rest
          )}`,
        };
      },
    }),
    getTotalStats: build.query<
      TotalStats,
      { begin: string | null; end: string | null; tag: string | null }
    >({
      query: (request) => ({
        url: `/api/usage/total${buildQueryParamsString(request)}`,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStatsQuery,
  useGetModelStatsQuery,
  useGetModelStatsTimeQuery,
  useGetTotalStatsQuery,
} = statsApi;
