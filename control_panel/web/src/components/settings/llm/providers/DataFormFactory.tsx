import { ReactNode } from "react";
import OpenAIDataForm from "./openai/DataForm";
import MistralDataForm from "./mistral/DataForm";
import GeminiDataForm from "./gemini/DataForm";
import AnthropicDataForm from "./anthropic/DataForm";
import AzureDataForm from "./azure/DataForm";
import BedrockDataForm from "./bedrock/DataForm";
import OpenAICompatibleDataForm from "./openAICompatible/DataForm";
import AzureMLChatScoreDataForm from "./azureMLChatScore/DataForm";
import AzureMLPromptScoreDataForm from "./azureMLPromptScore/DataForm";
import AzureMLEmbeddingScoreDataForm from "./azureMLEmbeddingScore/DataForm";
import { Providers } from "../../../../types/providers";
import { Control } from "react-hook-form";
import { LlmResponse } from "../../../../types/llm";

export type DataFormProps = {
  control: Control<LlmResponse, any>;
  current?: LlmResponse | null;
};

type DataFormFactoryProps = {
  provider: Providers;
} & DataFormProps;

const ProvidersMap: { [key: string]: (props: DataFormProps) => ReactNode } = {
  OpenAI: OpenAIDataForm,
  Azure: AzureDataForm,
  Bedrock: BedrockDataForm,
  Mistral: MistralDataForm,
  Anthropic: AnthropicDataForm,
  Gemini: GeminiDataForm,
  OpenAICompatible: OpenAICompatibleDataForm,
  AzureMLChatScore: AzureMLChatScoreDataForm,
  AzureMLPromptScore: AzureMLPromptScoreDataForm,
  AzureMLEmbeddingScore: AzureMLEmbeddingScoreDataForm,
};

const DataFormFactory = ({
  provider,
  current,
  control,
}: DataFormFactoryProps) => {
  const Component = ProvidersMap[provider];
  return Component ? <Component current={current} control={control} /> : <></>;
};

export default DataFormFactory;
