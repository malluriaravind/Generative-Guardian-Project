import { InvisibleTextPolicy } from "./controls/invisible-text";
import { LanguagePolicy } from "./controls/language";
import { TopicsPolicy } from "./controls/topics";
import { PiiPolicy } from "./controls/pii";
import { InjectionPolicy } from "./controls/injection";
import { CodeProvencePolicy } from "./controls/code-provenance";

export type Policy = {
  controls: string[];
  name: string;
  pii: PiiPolicy | null;
  invisible_text: InvisibleTextPolicy | null;
  languages: LanguagePolicy;
  topics: TopicsPolicy;
  injection: InjectionPolicy;
  apply_to_responses: boolean;
  code_provenance: CodeProvencePolicy;
  scopes: string[];
};

export type PolicyResponseItem = Policy & {
  _id: string;
  type: string;
  created_at: string;
  updated_at: string;
};

export type PolicyReponse = (PolicyResponseItem & { apps: number })[];

export type PolicyControlResponse = {
  name: string;
  value: string;
  disabled: false;
};

export type PolicyControlsResponse = PolicyControlResponse[];

export type CreatePolicyRequest = Policy;

export type UpdatePolicyRequest = CreatePolicyRequest & { id: string };
