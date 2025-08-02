import { LOCALSTORAGE_STATE_KEY } from "./constants";
import {
  type MiddlewareAPI,
  type Middleware,
  isRejectedWithValue,
} from "@reduxjs/toolkit";
import { setAlert } from "./slices/alert";
import { logout } from "./slices/user";

export const localStorageMiddleware: Middleware = ({ getState }) => {
  return (next) => (action) => {
    const result = next(action);
    const { user } = getState();
    localStorage.setItem(LOCALSTORAGE_STATE_KEY, JSON.stringify({ user }));
    return result;
  };
};

export const rtkQueryErrorLogger: Middleware =
  ({ dispatch }: MiddlewareAPI) =>
    (next) =>
      (action) => {
        if (isRejectedWithValue(action)) {
          if (action.payload.status == 401) {
            dispatch(logout());
          } else {
            dispatch(
              setAlert({
                type: "error",
                shouldRender: true,
                title: "",
                message: action.payload.data.message,
              })
            );
          }
        }
        return next(action);
      };
