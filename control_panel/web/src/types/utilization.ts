export type ChartLineSettings = {
  avg_response_time: boolean;
  errors: boolean;
  avg_total_tokens: boolean;
  prompt_tokens: boolean;
  completion_tokens: boolean;
};

export const chartLineSettingsDisplayNames: {
  [key in keyof ChartLineSettings]: string;
} = {
  avg_response_time: "Average Response Time",
  errors: "Errors",
  avg_total_tokens: "Average Total Tokens",
  prompt_tokens: "Prompt Tokens",
  completion_tokens: "Completion Tokens",
};

export type ChartLine = {
  color: string;
  dataKey: string;
  inactive: boolean;
  payload: { [key: string]: string };
  type: string;
  value: string;
};

export type StatsLineGraph = {
  avg_response_time: number;
  avg_total_tokens: number;
  completion_tokens: number;
  date: string;
  errors: number;
  max_response_time: number;
  prompt_tokens: number;
  warnings: number;
};

export interface UtilizationFilters {
  tag: string | null;
  llm: string | null;
  app: string | null;
}

export type UtilizationBaseRequest = {
  provider?: string | null;
  app?: string | null;
  llm?: string | null;
  pool?: string | null;
  model?: string | null;
  tag?: string | null;
  begin?: string | null;
  end?: string | null;
};

export type AggregateRequest = UtilizationBaseRequest & {
  dateFrame: "minute" | "day" | "week" | "month";
};
