export type StatsType = "app" | "llm";
export type Stats = {
  _id: string;
  name: string;
  virtual_model_name:string;
  model: string;
  total_cost: number;
  total_tokens: number;
  request_body: object;
  response_time: number;
  cost_trend: number;
  avg_requst: number;
  total_request: number;
  avg_response_time: number;
  avg_total_tokens: number;
  completion_tokens: number;
  prompt_tokens: number;
  max_response_time: number;
  errors: number;
  date: string;
  error: {
    code: string;
    http_code: number;
    message: string;
    type: string;
  }
  timestamp: string;
};
export type StatsObject = Stats & { color: string };
export type StatsGraph = {
  objects: StatsObject[];
  data: { [key: string]: string }[];
};
export type TotalStats = {
  tokens: {
    total: number;
    previous_total: number;
    average: number;
    completion: number;
    prompt: number;
  };
  cost: {
    total: number;
    previous_total: number;
    error: number;
  };
  budget: {
    total: number;
    forecasted: number;
  };
  reponse_time: {
    average_ms: number;
    peak_ms: number;
  };
  policies: {
    total: number;
  };
  warnings: number;
  errors: number;
  response_time_ms: number
  average_ms: number;
};

  