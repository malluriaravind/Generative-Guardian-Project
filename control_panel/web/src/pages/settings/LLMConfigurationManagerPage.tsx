import { useParams } from "react-router";
import { useGetLlmQuery } from "../../api/llm";
import LlmManager from "../../components/settings/llm/LlmManager";

export const LlmUpdateConfigurationManagerPage = () => {
  const { id } = useParams();
  const { data, isLoading } = useGetLlmQuery({
    allmodels: true,
    id: id || "EmptyId",
  });

  return <LlmManager current={data!} isLoading={isLoading} />;
};

export const LLMCreateConfigurationManagerPage = () => {
  return <LlmManager current={null} isLoading={false} />;
};
