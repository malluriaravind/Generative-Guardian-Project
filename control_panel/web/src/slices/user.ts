import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { authApi } from "../api/auth";
import { AuthResponse } from "../types/auth";
import { userApi } from "../api/user";
import { Profile } from "../types/user";
import Cookies from 'js-cookie';
export type UserState = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  accessToken: string | null;
  available_api_namespaces: string[];
  is_root: boolean;
};

const initialState: UserState = {
  firstName: null,
  lastName: null,
  email: null,
  accessToken: null,
  available_api_namespaces: [],
  is_root: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setProfile: (state: UserState, { payload }: PayloadAction<Profile>) => {
      return { ...state, ...payload };
    },
    logout: () => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      authApi.endpoints.login.matchFulfilled,
      (state: UserState, { payload }: PayloadAction<AuthResponse>) => {
        state.accessToken = payload.token;
      }
    );
    builder.addMatcher(
      authApi.endpoints.logout.matchFulfilled,
      () => { 
        Cookies.set('token', '');
        Cookies.remove('token');
        return initialState; 
      },
    );
    builder.addMatcher(
      userApi.endpoints.applyProfileInfo.matchFulfilled,
      (state: UserState, { payload }: PayloadAction<Profile>) => {
        return { ...state, ...payload };
      }
    );
  },
});

export default userSlice.reducer;

export const { logout, setProfile } = userSlice.actions;
