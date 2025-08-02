import { Moment } from "moment";

type ApiKey = {
  _id: string;
  name: string;
  api_key_hash: string;
  api_key_suffix: string;
  llm_access: string[];
  pool_access: string[];
  policies: string[];
  created_at: string;
  created_by: string;
  color: string;
  expires_at: Moment | null;
  rate_requests: number | null;
  rate_period: string | null;
  max_prompt_tokens: number | null;
  key: string | null;
  tags: string[] | undefined;
  log_prompts: boolean;
  log_completions: boolean;
  log_enable: boolean;
  log_level: number | null;
  log_retention_hours: number;
  log_duration_hours: number;
  log_until: string | null;
  log_reqres: boolean;
  scopes: string[] | null;
};

export type ApiKeyCreateRequest = {
  name: string;
  scopes: string[];
  llm_access: string[];
  pool_access: string[];
  policies: string[];
  color: string | null;
  expires_at?: string | null;
  rate_requests?: number | null;
  rate_period?: string | null;
  max_prompt_tokens?: number | null;
  key?: string | null;
  tags: string[] | undefined;
  log_prompts: boolean;
  log_completions: boolean;
  log_enable: boolean;
  log_level: number | null;
  log_retention_hours: number;
  log_duration_hours: number;
  log_until: string | null;
};

export type ApiKeyUpdateRequest = ApiKeyCreateRequest & { id: string };

export type ApiKeyResponse = ApiKey;
