export type LogViewerDrawerType = "filter" | "settings" | "weekly";

export type StatsTypes = "prompt" | "app" | "dev";

export type LogViewerResponse = {
  id: string;
  message: string;
  created_at: string;
  request_id: string;
  levelno: number;
  levelname: string;
} & { [key: string]: string };

export type LogViewerRequest = {
  limit: number;
  begin: string;
  level: number;
  status: number | null;
  end: string;
  sort: "+created_at" | "-created_at";
  method: string | null;
  keywords: string;
  app: string;
  llm: string;
  request_id: string | null;
  responses: boolean;
  prompts: boolean;
};

export type LogLevel = {
  name: string;
  level: number;
};

export type Field = {
  name: string;
  show: boolean;
  title: string;
};

export type LogParams = {
  logger: string;
  level: number;
};

export type LogDuration = {
  name: string;
  hours: number;
};

export type LogRetention = LogDuration;

export type LogExportFormat = {
  name: string;
  value: string;
};

export type LogSettings = {
  retention_hours: number;
  export_format: string;
};

export type LogDescriptiveHttpCode = {
  name: string;
  value: string;
};

// Updated Weekly Email Configuration type with new fields.
export type WeeklyEmailConfig = {
  emails: string[];
  day: string; // e.g., "Monday"
  subject: string;
  template_body: Record<string, any>;
  template_name: string;
  enabled: boolean;
  last_sent?: string; // Date string when the report was last sent
  time: string; // Scheduled send time in "HH:MM" format
  timezone: string; // Time zone string (e.g., "America/New_York")
  report_period: number; // Number of period units for report duration
  report_period_unit: "days" | "weeks" | "months"; // Unit for report duration
};

// You may also alias this configuration type as needed:
// export type WeeklyEmailConfigDto = WeeklyEmailConfig;
