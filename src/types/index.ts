export interface LogEntry {
  id: string;
  timestamp: number;
  timestampISO?: string;
  level: "info" | "debug" | "warn" | "error";
  message: string;
  prefix?: string;
}

export type BufferedOptions = {
  flushIntervalMs?: number;
  batchSize?: number;
  maxBufferSize?: number;
  persistToLocalStorage?: boolean;
};

export interface ConfigOptions {
  logPrefix: string;
  logRetentionDays: number;
  bufferedOptions?: BufferedOptions;
}

