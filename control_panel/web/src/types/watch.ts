export type WatchType = "APP" | "LLM";

export type Watch = {
  name: string;
  object_type: WatchType;
  object_id: string;
  enabled: boolean | null;
};
