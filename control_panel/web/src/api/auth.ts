import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_DOMAIN } from "../constants";
import { AuthRequest, AuthResponse } from "../types/auth";
import { UserCreationRequest } from "../types/user";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_DOMAIN,
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, AuthRequest>({
      query: ({ email, password, rememberme }) => ({
        url: "/api/login",
        method: "POST",
        body: { email, password, rememberme },
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/api/logout",
        method: "POST",
      }),
    }),
    signup: builder.mutation<{ success: boolean }, UserCreationRequest>({
      query: (userCreationData) => ({
        url: "/api/signup",
        method: "POST",
        body: {
          first_name: userCreationData.firstName,
          last_name: userCreationData.lastName,
        },
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, { email: string }>({
      query: ({ email }) => ({
        url: "/api/reset-password",
        method: "POST",
        body: { email },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useResetPasswordMutation,
} = authApi;

export default authApi;
