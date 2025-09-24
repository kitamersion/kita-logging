# kita-logging

Lightweight IndexDB logging library for web applications.

## Features

- Log messages with levels: info, debug, warn, error
- Log history stored in IndexedDB (works in browsers)
- Configurable log prefix and retention period
- Simple API for reading logs and updating config

## Installation

```
npm install @kitamersion/kita-logging
```

## Usage

You can also expose log history or config options in your UI by calling the respective APIs from event handlers or effects.

```typescript
import { logger, config, history } from "@kitamersion/kita-logging";

// Configure logging (optional)
await config.setLogPrefix("[MY_APP]");
await config.setLogRetentionDays(14); // keep logs for 14 days

// Add a log
await logger.info("App started");

// Log more messages
await logger.warn("Something might be wrong");
await logger.error("Something went wrong");

// Read log history
// Read logs (each entry includes `timestamp` (ms) and `timestampISO` for display)
const logs = await history.getLogs();
console.log(logs);

// View current config
const currentConfig = await config.viewCurrentConfigurations();
console.log(currentConfig);
```

## React Example: Context/Provider Pattern

For a more React-idiomatic approach, you can wrap your app in a LoggerProvider and use a custom hook to access and update logging config anywhere in your component tree.

```tsx
import { config } from "@kitamersion/kita-logging";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  PropsWithChildren,
} from "react";

type LoggerConfigContextType = {
  logPrefix: string;
  logRetentionDays: number;
  setLogPrefix: (prefix: string) => Promise<void>;
  setLogRetentionDays: (days: number) => Promise<void>;
};

const LoggerConfigContext = createContext<LoggerConfigContextType | undefined>(
  undefined
);

export const useLoggerConfig = () => {
  const context = useContext(LoggerConfigContext);
  if (!context) {
    throw new Error("useLoggerConfig must be used within a LoggerProvider");
  }
  return context;
};

export const LoggerProvider = ({ children }: PropsWithChildren<object>) => {
  const [logPrefix, setLogPrefixState] = useState("");
  const [logRetentionDays, setLogRetentionDaysState] = useState(7);

  // Load config on mount
  useEffect(() => {
    // Fetch current configurations
    config.viewCurrentConfigurations().then((cfg) => {
      setLogPrefixState(cfg.logPrefix);
      setLogRetentionDaysState(1);
    });

    // OR...

    // Set you configurations
    config.setLogPrefix("[YOUR_APP_PREFIX]"); // Set your desired prefix here
    config.setLogRetentionDays(1);
  }, []);

  const setLogPrefix = async (prefix: string) => {
    await config.setLogPrefix(prefix);
    setLogPrefixState(prefix);
  };
  const setLogRetentionDays = async (days: number) => {
    await config.setLogRetentionDays(days);
    setLogRetentionDaysState(days);
  };

  const contextValue = useMemo(
    () => ({ logPrefix, logRetentionDays, setLogPrefix, setLogRetentionDays }),
    [logPrefix, logRetentionDays]
  );

  return (
    <LoggerConfigContext.Provider value={contextValue}>
      {children}
    </LoggerConfigContext.Provider>
  );
};
```

## API

### logger

- `logger.info(message: string)`
- `logger.debug(message: string)`
- `logger.warn(message: string)`
- `logger.error(message: string)`

### config

- `setLogPrefix(prefix: string)` — Set the prefix for all log messages
- `setLogRetentionDays(days: number)` — Set how many days to keep logs
- `getLogPrefix()` — Get the current log prefix
- `getLogRetentionDays()` — Get the current retention period
- `viewCurrentConfigurations()` — Get all current config options

### history

- `getLogs()` — Get all logs from IndexedDB (newest first)
- `deleteExpiredLogs()` — Remove logs older than the retention period
- `deleteAllLogs()` — Remove all logs from storage (manual cleanup)

---
