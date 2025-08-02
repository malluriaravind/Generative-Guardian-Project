import { PayloadAction, createSlice } from "@reduxjs/toolkit";

type Alert = {
  shouldRender: boolean;
  type: "info" | "warning" | "success" | "error";
  title: string;
  message: string;
};

type AlertState = { 
  alerts: Alert[];
}

const initialState: AlertState = {
  alerts: [],
};

const alertSlice = createSlice({
  name: "alert",
  initialState,
  reducers: {
    setAlert: (state: AlertState, { payload }: PayloadAction<Alert>) => {
      state.alerts.push(payload);
    },
    clearAlert: ({alerts}: AlertState) => ({alerts: alerts.slice(1)}),
  },
});

export const { setAlert, clearAlert } = alertSlice.actions;
export default alertSlice.reducer;
