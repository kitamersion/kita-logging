<h1 align="center"><strong>Kita Logging</strong></h1>

`@kitamersion/kita-logging` a lightweight, browser-focused logging library that buffers logs in-memory and persists them to IndexedDB in batches.

## Key features

- Buffered, fire-and-forget logging for minimal runtime impact
- Persists logs to IndexedDB with a `by_timestamp` index (newest-first reads)
- Configurable log prefix and retention period
- Small public API: `logger` (default), `config`, and `history`
- Safe local snapshot to `localStorage` on failures (optional)

## Install

```bash
npm install @kitamersion/kita-logging
```

## Quick usage

Default exports: a buffered `logger` instance (default export) plus named `history` and `config` helpers.

```ts
import logger, { history, config } from "@kitamersion/kita-logging";

// fire-and-forget
logger.info("App started");
logger.warn("Possible issue detected");

// wait for persistence when needed
await logger.flush();

// read logs (newest first)
const logs = await history.getLogs();
console.log(logs[0].timestampISO, logs[0].message, logs[0].prefix);

// configure
await config.setLogPrefix("[MY_APP]");
await config.setLogRetentionDays(14);
```

## React: Provider + hook example

```tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { config } from "@kitamersion/kita-logging";

type SimpleLoggerConfig = {
  logPrefix: string;
  logRetentionDays: number;
};

const SimpleLoggerContext = createContext<SimpleLoggerConfig | undefined>(
  undefined,
);

export const useSimpleLoggerConfig = () => {
  const ctx = useContext(SimpleLoggerContext);
  if (!ctx)
    throw new Error(
      "useSimpleLoggerConfig must be used within LoggerProviderSimple",
    );
  return ctx;
};

// Minimal provider that ensures defaults and exposes current values
export const LoggerProviderSimple = ({
  children,
}: PropsWithChildren<object>) => {
  const [logPrefix, setLogPrefix] = useState("[KITA_LOGGING]");
  const [logRetentionDays, setLogRetentionDays] = useState(7);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cfg = await config.viewCurrentConfigurations();
      let prefix = cfg.logPrefix;
      if (!prefix || prefix.trim() === "") {
        prefix = "[KITA_LOGGING]";
        await config.setLogPrefix(prefix);
      }
      let days = cfg.logRetentionDays;
      if (!days || days <= 0) {
        days = 1;
        await config.setLogRetentionDays(days);
      }
      if (!mounted) return;
      setLogPrefix(prefix);
      setLogRetentionDays(days);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SimpleLoggerContext.Provider value={{ logPrefix, logRetentionDays }}>
      {children}
    </SimpleLoggerContext.Provider>
  );
};

export default LoggerProviderSimple;
```

## Exposed APIs

logger (default export)

- `logger.info(message: string): void` — push an info-level log
- `logger.debug(message: string): void` — push a debug-level log
- `logger.warn(message: string): void` — push a warn-level log
- `logger.error(message: string): void` — push an error-level log
- `logger.flush(): Promise<void>` — force flush buffered entries to IndexedDB
- `logger.start(): void` — start periodic flush (enabled by default)
- `logger.stop(): Promise<void>` — stop periodic flush and flush remaining entries
- `logger.config` — read-only object with runtime configuration values
- `logger.refresh(): Promise<void>` — refresh prefix from persisted config

config (named export)

- `config.setLogPrefix(prefix: string): Promise<void>`
- `config.getLogPrefix(): Promise<string>`
- `config.setLogRetentionDays(days: number): Promise<void>`
- `config.getLogRetentionDays(): Promise<number>`
- `config.viewCurrentConfigurations(): Promise<{ logPrefix: string, logRetentionDays: number }>`

history (named export)

- `history.getLogs(): Promise<LogEntry[]>` — returns newest-first; `LogEntry` includes: `id`, `timestamp` (ms), `timestampISO`, `level`, `message`, `prefix`
- `history.deleteExpiredLogs(retentionDays?: number): Promise<void>`
- `history.deleteAllLogs(): Promise<void>`

## Configuration options (buffered logger)

When creating a custom buffered logger via `createBufferedLogger(opts)`, available options:

- `flushIntervalMs` (number) — automatic flush interval in ms (default: `2000`)
- `batchSize` (number) — entries per flush (default: `50`)
- `maxBufferSize` (number) — max entries in memory (default: `5000`)
- `persistToLocalStorage` (boolean) — snapshot buffer to `localStorage` on failures (default: `true`)

## Tests & development

Run build and tests locally:

```bash
npm run build
npm run test
```

## Notes

- The logger is intentionally buffered. Call `logger.flush()` when you need to guarantee persistence (e.g., before a critical navigation or test assertion).
- Log entries include both a numeric `timestamp` (ms since epoch) and `timestampISO` for UI display.
- `history.getLogs()` returns newest-first by default. For very large datasets use cursor-based reads on the `by_timestamp` index for streaming/pagination.
