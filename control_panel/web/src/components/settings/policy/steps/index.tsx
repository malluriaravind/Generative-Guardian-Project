import PiiStep from "./PIIStep";
import InvisibleText from "./InvisibleTextStep";
import LanguageStep from "./LanguageStep";
import TopicsStep from "./TopicsStep";
import InjectionStep from "./InjectionStep";
import CodeProvenance from "./CodeProvenance";

const steps: { [key: string]: JSX.Element } = {
  "pii-config": <PiiStep />,
  "invisible-text": <InvisibleText />,
  languages: <LanguageStep />,
  topics: <TopicsStep />,
  injection: <InjectionStep />,
  "code-provenance": <CodeProvenance />,
};

export default steps;
