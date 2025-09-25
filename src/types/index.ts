export interface LogEntry {
  id: string;
  timestamp: number;
  timestampISO?: string;
  level: "info" | "debug" | "warn" | "error";
  message: string;
  prefix?: string;
  stack?: string;
}

export type BufferedOptions = {
  flushIntervalMs?: number;
  batchSize?: number;
  maxBufferSize?: number;
  persistToLocalStorage?: boolean;
  // whether to capture/attach stack traces for error logs
  captureStack?: boolean;
  // maximum number of characters to store for stack traces
  maxStackChars?: number;
};

export interface ConfigOptions {
  logPrefix: string;
  logRetentionDays: number;
  bufferedOptions?: BufferedOptions;
}

