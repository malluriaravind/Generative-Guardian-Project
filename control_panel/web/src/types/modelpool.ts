export type Model = {
  key: string;
  llm_id: string;
  llm_name: string;
  alias: string;
  name: string;
  enabled: boolean;
};

export type ModelPoolResponse = {
  _id: string;
  virtual_model_name: string;
  name: string;
  models: Model[];
  tags: string[] | undefined;
  fanout: boolean;
  scopes: string[];
};

export type ModelPoolCreateRequest = {
  virtual_model_name: string;
  name: string;
  models: Model[];
  tags: string[] | undefined;
  fanout: boolean;
  scopes: string[];
};

export type ModelPoolUpdateRequest = ModelPoolCreateRequest & { id: string };
