import { PayloadAction, createSlice, nanoid } from "@reduxjs/toolkit";

export type FiltersForm = {
  id: string;
  begin: string | null;
  end: string | null;
  app: string | null;
  llm: string | null;
  level: number | null;
  method: string | null;
  status: number | null;
  keywords: string | null;
  request_id: string | null;
  responses: boolean;
  prompts: boolean;
  endDate: string | null;
};

type LogViewerState = {
  filter: FiltersForm;
};

const initialState: LogViewerState = {
  filter: {
    id: nanoid(),
    app: null,
    llm: null,
    level: null,
    method: null,
    status: null,
    keywords: null,
    request_id: null,
    prompts: true,
    responses: true,
    endDate: null,
  },
};

const logViewerSlice = createSlice({
  name: "log_viewer",
  initialState,
  reducers: {
    setFilter: (
      state: LogViewerState,
      { payload }: PayloadAction<Partial<FiltersForm>>
    ) => {
      if (typeof payload.endDate === "undefined") {
        state.filter.endDate = null;
        state.filter.id = nanoid();
      }
      state.filter = { ...state.filter, ...payload };
    },
    resetLogViewer: () => initialState,
  },
});

export const { setFilter, resetLogViewer } = logViewerSlice.actions;

export default logViewerSlice.reducer;
