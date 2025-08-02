import { TokensResponse } from "../types/tokens";
import { userApi } from "./user";

const tokensApi = userApi.injectEndpoints({
  endpoints: (builder) => ({
    issueToken: builder.mutation<{ token: string }, { daysUntilExpiration: number }>({
      query: ({daysUntilExpiration}) => ({
        method: "POST",
        url: `/api/tokens/issue?days=${daysUntilExpiration}`,
      }),
      invalidatesTags: ["tokens"],
    }),
    revokeToken: builder.mutation<void, { token: string }>({
      query: ({token}) => ({
        method: "POST",
        url: `/api/tokens/revoke?jti=${token}`,
      }),
      invalidatesTags: ["tokens"],
    }),
    getTokens: builder.query<TokensResponse[], void>({
      query: () => `/api/tokens/fetch`,
      providesTags: ["tokens"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useRevokeTokenMutation,
  useGetTokensQuery,
  useIssueTokenMutation,
} = tokensApi;
