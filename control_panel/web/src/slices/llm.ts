import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { ModelObject } from "../types/llm";
import { Providers, ProvidersPayload } from "../types/providers";

type LlmState = {
  id?: string | null;
  name: string;
  color: string;
  provider: Providers;
  models?: ModelObject[] | null;
  tags?: string[] | null;
} & ProvidersPayload;

const initialState: LlmState = {
  name: "",
  provider: "OpenAI",
  color: "",
};

const llmSlice = createSlice({
  name: "llm",
  initialState,
  reducers: {
    setData: (state: LlmState, { payload }: PayloadAction<LlmState>) => {
      return { ...state, ...payload, models: state.models };
    },
    setModels: (state: LlmState, { payload }: PayloadAction<ModelObject[]>) => {
      state.models = payload;
    },
    reset: () => initialState,
  },
});

export const { setData, reset, setModels } = llmSlice.actions;

export default llmSlice.reducer;
