export const DB_NAME = "kita_logging_db";
export const STORE_NAME = "logs";
export const STORE_CONFIG = "config";

export const DEFAULT_LOG_PREFIX = "[KITA_LOGGING]";
export const DEFAULT_RETENTION_DAYS = 7;

// Defaults for buffered logger options
export const DEFAULT_BUFFERED_OPTIONS = {
	flushIntervalMs: 2000,
	batchSize: 50,
	maxBufferSize: 5000,
	persistToLocalStorage: true,
};
