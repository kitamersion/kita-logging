export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'debug' | 'warn' | 'error';
  message: string;
}

export interface ConfigOptions {
  logPrefix: string;
  logRetentionDays: number;
}