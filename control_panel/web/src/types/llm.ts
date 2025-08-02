import { ProvidersPayload, Providers } from "./providers";

export type LlmStatus = "Connected" | "Pending" | "Error" | "Disabled";

export type ModelObject = {
  enabled: boolean;
  name: string;
  alias: string;
  price_input: string;
  price_output: string;
};

export type LlmResponse = {
  _id: string;
  name: string;
  provider: Providers;
  models?: ModelObject[];
  api_key_suffix: string;
  created_by: string;
  status: LlmStatus;
  added_at: string;
  color: string;
  tags: string[];
  scopes: string[] | null;
} & ProvidersPayload;

export type LlmCreateRequest = {
  name: string;
  provider: Providers;
  models: ModelObject[];
  color: string;
  tags: string[];
} & ProvidersPayload;

export type LlmUpdateRequest = LlmCreateRequest & {
  _id: string;
};
