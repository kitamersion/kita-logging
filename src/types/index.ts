export interface LogEntry {
  id: string;
  timestamp: number;
  timestampISO?: string;
  level: "info" | "debug" | "warn" | "error";
  message: string;
  prefix?: string;
}

export interface ConfigOptions {
  logPrefix: string;
  logRetentionDays: number;
}

