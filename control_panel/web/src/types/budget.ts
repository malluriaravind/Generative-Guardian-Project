import { Watch } from "./watch";

export type BudgetPeriod = "Monthly";

export type Budget = {
  _id: string;
  name: string;
  period: string;
  timezone: string | null;
  watch: Watch[];
  budget: number;
  mode: string;
  limited: boolean;
  starts_at: Date;
  ends_at: Date;
  tags: string[];
  scopes: string[];
};

export type BudgetMode = {
  name: string;
  value: string;
  supported_periods: string[];
};

export type BudgetModeResponse = BudgetMode[];
export type BudgetResponse = Budget;
export type BudgetRequest = Omit<Budget, "_id">;
