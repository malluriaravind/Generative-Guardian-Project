export type Providers =
  | "OpenAI"
  | "Azure"
  | "Bedrock"
  | "Gemini"
  | "Anthropic"
  | "Mistral"
  | "OpenAICompatible"
  | "AzureMLChatScore"
  | "AzureMLPromptScore"
  | "AzureMLEmbeddingScore";

export type NameValuePair = {
  name: string;
  value: string;
};

export type Tokenizer = {
  name: string;
  path: string;
  revision?: string | null;
};

type Provider = {
  timeout: number;
  max_connections: number;
  max_keepalive_connections: number;
};

export type OpenAI = Provider & {
  api_key: string;
};

export type Azure = Provider & {
  api_key: string;
  endpoint: string;
  deployment: string;
  version: string;
};

export type Bedrock = Provider & {
  access_key_id: string;
  access_key: string;
  region: string;
};

export type OpenAICompatible = Provider & {
  completion_endpoint: string;
  authorization_header: string;
  authorization_value: string;
  headers: NameValuePair[];
};

type EmbeddingOpenAICompatible = OpenAICompatible & { embedding_endpoint: string };

type TokenizedOpenAICompatible = OpenAICompatible & { tokenizer: Tokenizer };

export type AzureMLChatScore = TokenizedOpenAICompatible & { openai_input: boolean };

export type AzureMLPromptScore = TokenizedOpenAICompatible;

export type AzureMLEmbeddingScore = Omit<TokenizedOpenAICompatible, "completion_endpoint"> & { embedding_endpoint: string };

export type Mistral = OpenAI;

export type Anthropic = OpenAI;

export type Gemini = OpenAI;

export type ProvidersPayload = {
  openai?: OpenAI | null;
  azure?: Azure | null;
  bedrock?: Bedrock | null;
  anthropic?: Anthropic | null;
  gemini?: Gemini | null;
  mistral?: Mistral | null;
  openaicompatible?: EmbeddingOpenAICompatible | null;
  azuremlchatscore?: AzureMLChatScore | null;
  azuremlpromptscore?: AzureMLPromptScore | null;
  azuremlembeddingscore?: AzureMLEmbeddingScore | null;
};
