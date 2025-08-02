import { AlertResponse } from "./alert";

export type TriggeredResponse = AlertResponse & {
  alert_id: string;
  checked: boolean;
  checked_at: string | null;
  triggered_at: string | null;
};
