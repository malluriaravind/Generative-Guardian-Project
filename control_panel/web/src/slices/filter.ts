import { PayloadAction, createSlice } from "@reduxjs/toolkit";

type DateRange = { startDate: string | null; endDate: string | null };

type FilterState = {
  dateRange: DateRange | null;
};

const initialState: FilterState = { dateRange: null };

const filterSlice = createSlice({
  name: "filter",
  initialState,
  reducers: {
    setDateRange: (
      state: FilterState,
      { payload }: PayloadAction<DateRange>
    ) => {
      state.dateRange = payload;
    },
  },
});

export const { setDateRange } = filterSlice.actions;

export default filterSlice.reducer;
