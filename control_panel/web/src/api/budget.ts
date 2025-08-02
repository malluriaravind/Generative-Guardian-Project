import {
  Budget,
  BudgetModeResponse,
  BudgetRequest,
  BudgetResponse,
} from "../types/budget";
import { Watch } from "../types/watch";
import { userApi } from "./user";

const budgetApi = userApi.injectEndpoints({
  endpoints: (build) => ({
    fetchModes: build.query<BudgetModeResponse, void>({
      query: () => ({ url: `/api/budget/descriptive-modes` }),
    }), 
    fetchBudgets: build.query<BudgetResponse[], void>({
      query: () => ({ url: `/api/budget/fetch` }),
      providesTags: ["budget"],
    }),
    createBudget: build.mutation<BudgetResponse, BudgetRequest>({
      query: (body) => ({
        url: `/api/budget/create`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["budget"],
    }),
    updateBudget: build.mutation<number, Budget>({
      query: (body) => ({
        url: `/api/budget/update?id=${body._id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["budget"],
    }),
    deleteBudget: build.mutation<number, { id: string }>({
      query: ({ id }) => ({
        url: `/api/budget/delete?id=${id}`,
        method: "POST",
      }),
      invalidatesTags: ["budget"],
    }),
    getBudgetWatches: build.query<Watch[], void>({
      query: () => ({ url: `/api/budget/watch-objects` }),
      providesTags: ["budget"],
    }),
    getBudgetPeriods: build.query<string[], void>({
      query: () => ({ url: `/api/budget/watch-periods` }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBudgetPeriodsQuery,
  useGetBudgetWatchesQuery,
  useFetchBudgetsQuery,
  useFetchModesQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetApi;
