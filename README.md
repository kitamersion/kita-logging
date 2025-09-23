## React Example: Context/Provider Pattern

For a more React-idiomatic approach, you can wrap your app in a LoggerProvider and use a custom hook to access and update logging config anywhere in your component tree.

```tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { logger, config } from "kita-logging";

// Logger context and provider
const LoggerConfigContext = createContext(null);

export function LoggerProvider({ children }) {
  const [logPrefix, setLogPrefixState] = useState("");
  const [logRetentionDays, setLogRetentionDaysState] = useState(7);

  useEffect(() => {
    config.viewCurrentConfigurations().then((cfg) => {
      setLogPrefixState(cfg.logPrefix);
      setLogRetentionDaysState(cfg.logRetentionDays);
    });
  }, []);

  const setLogPrefix = async (prefix) => {
    await config.setLogPrefix(prefix);
    setLogPrefixState(prefix);
  };
  const setLogRetentionDays = async (days) => {
    await config.setLogRetentionDays(days);
    setLogRetentionDaysState(days);
  };

  return (
    <LoggerConfigContext.Provider
      value={{ logPrefix, logRetentionDays, setLogPrefix, setLogRetentionDays }}
    >
      {children}
    </LoggerConfigContext.Provider>
  );
}

export function useLoggerConfig() {
  return useContext(LoggerConfigContext);
}

// Usage in your app
function App() {
  const { logPrefix, setLogPrefix } = useLoggerConfig();

  useEffect(() => {
    logger.info("App started with prefix: " + logPrefix);
  }, [logPrefix]);

  return (
    <div>
      <h1>Logger Prefix: {logPrefix}</h1>
      <button onClick={() => setLogPrefix("[NEW_PREFIX]")}>
        Change Prefix
      </button>
    </div>
  );
}

// In your main entry point:
// <LoggerProvider><App /></LoggerProvider>
```

This pattern lets you manage and update logging config anywhere in your React app, and is ideal for settings pages or browser extension UIs.

# kita-logging

Lightweight IndexDB logging library for web applications.

## Features

- Log messages with levels: info, debug, warn, error
- Log history stored in IndexedDB (works in browsers)
- Configurable log prefix and retention period
- Simple API for reading logs and updating config

## Installation

```
npm install kita-logging
```

## Usage

You can also expose log history or config options in your UI by calling the respective APIs from event handlers or effects.

```typescript
import { logger, config, history } from "kita-logging";

// Configure logging (optional)
await config.setLogPrefix("[MY_APP]");
await config.setLogRetentionDays(14); // keep logs for 14 days

// Log messages
await logger.info("App started");
await logger.warn("Something might be wrong");
await logger.error("Something went wrong");

// Read log history
const logs = await history.getLogs();
console.log(logs);

// View current config
const currentConfig = await config.viewCurrentConfigurations();
console.log(currentConfig);
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

- `getLogs()` — Get all logs from IndexedDB
- `purgeOldLogs()` — Remove logs older than the retention period

---
