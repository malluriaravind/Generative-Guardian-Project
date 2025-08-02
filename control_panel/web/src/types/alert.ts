import { Watch } from "./watch";

export type AlertThreshold = "Ok" | "Exceeded";

export type AlertResponse = {
  _id: string;
  name: string;
  period: string;
  budget: number | null;
  budget_percentage: number | null;
  used: number;
  threshold: AlertThreshold;
  notify_to: string[];
  watch: Watch[];
  forecasted_budget: number | null;
  timezone: string;
  created_at: string;
  scopes: string[];
};

export type AlertCreateRequest = {
  name: string;
  period: string;
  watch: Watch[];
  budget: number;
  budget_percentage: number | null;
  notify_to: string[];
  timezone: string;
  scopes: string[];
};

export type AlertUpdateRequest = AlertCreateRequest & { id: string };

export type AlertGraph = {
  period: string;
  actual: number;
  budget: number;
};
