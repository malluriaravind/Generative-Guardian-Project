import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/user";
import alertReducer from "./slices/alert";
import filterReducer from "./slices/filter";
import llmReducer from "./slices/llm";
import logViewerReducer from "./slices/log_viewer";
import policyReducer, { initialState as policyInitialState } from "./slices/policy";
import { authApi } from "./api/auth";
import { userApi } from "./api/user";
import { localStorageMiddleware, rtkQueryErrorLogger } from "./middlewares";
import { LOCALSTORAGE_STATE_KEY } from "./constants";
import { setupListeners } from "@reduxjs/toolkit/query";
import Cookies from 'js-cookie';

const reHydrateStore = () => {
  if (localStorage.getItem(LOCALSTORAGE_STATE_KEY) !== null) {
    const preloadData = {
      ...JSON.parse(localStorage.getItem(LOCALSTORAGE_STATE_KEY)!),
      filter: { dateRange: null },
      policy: policyInitialState,
    };
    const accessToken = Cookies.get('token');
    if(accessToken) {
      preloadData.user.accessToken = accessToken;
    }
    return preloadData;
  }
};
export const store = configureStore({
  reducer: {
    user: userReducer,
    alert: alertReducer,
    llm: llmReducer,
    filter: filterReducer,
    policy: policyReducer,
    logViewer: logViewerReducer,
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([
      localStorageMiddleware,
      authApi.middleware,
      userApi.middleware,
      rtkQueryErrorLogger,
    ]),
  preloadedState: reHydrateStore(),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

setupListeners(store.dispatch);
