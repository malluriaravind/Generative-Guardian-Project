import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CreatePolicyRequest } from "../types/policy";


type PolicyState = {
    steps: string[];
    stepIndex: number;
    currentStep: string;
    isFinished: boolean;
    id: string | null;
    current: CreatePolicyRequest;
};

export const initialState: PolicyState = {
    stepIndex: 0,
    steps: ['manage'],
    currentStep: 'manage',
    isFinished: false,
    id: null,
    current: {
        apps: [],
        controls: [],
        name: '',
        pii: null
    }
};

const policySlice = createSlice({
    name: "policy",
    initialState,
    reducers: {
        next: (state: PolicyState) => {
            if (state.isFinished || state.stepIndex === state.steps.length - 1) {
                state.isFinished = true;
                return;
            }
            state.stepIndex += 1;
            state.currentStep = state.steps[state.stepIndex];
        },
        back: (state: PolicyState) => {
            if (state.stepIndex === 0) {
                return;
            }
            state.stepIndex -= 1;
            state.currentStep = state.steps[state.stepIndex];
        },
        reset: () => initialState,
        setSteps: (state: PolicyState, { payload }: PayloadAction<string[]>) => {
            state.steps = [...initialState.steps, ...payload];
        },
        setData: (state: PolicyState, { payload }: PayloadAction<Partial<CreatePolicyRequest>>) => {
            state.current = { ...state.current, ...payload };
        },
        setId: (state: PolicyState, { payload }: PayloadAction<string>) => {
            state.id = payload;
        }
    },
});

export const { next, back, reset, setData, setId, setSteps } = policySlice.actions;

export default policySlice.reducer;
