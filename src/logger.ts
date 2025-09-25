import { getLogPrefix, getBufferedOptions, onBufferedOptionsChange } from "./config";
import { saveLogs } from "./history";
import type { BufferedOptions, LogEntry } from "./types";
import { DEFAULT_BUFFERED_OPTIONS } from "./defaults";

// Buffered, fire-and-forget logger implementation.

// use shared defaults from `defaults.ts`
const DEFAULT_BUFFERED: Required<BufferedOptions> = {
  ...(DEFAULT_BUFFERED_OPTIONS as Required<BufferedOptions>),
};

const LS_KEY = "kita_logging_buffer_snapshot_v1";

let _cachedPrefix: string | null = null;
// initialize prefix in background
(async () => {
  try {
    _cachedPrefix = await getLogPrefix();
  } catch (e) {
    _cachedPrefix = null;
  }
})();

export const createLogger = (opts?: BufferedOptions) => {
  const cfg = { ...DEFAULT_BUFFERED, ...(opts || {}) };
  type LogPayload = Omit<LogEntry, "id" | "timestamp">;
  type Deferred = { res: () => void; rej: (err?: unknown) => void };
  type BufferItem = LogPayload & { __deferred?: Deferred };

  let buffer: BufferItem[] = [];
  let timer: number | null = null;
  let stopped = false;

  const loadSnapshot = () => {
    if (!cfg.persistToLocalStorage) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const items = JSON.parse(raw);
      if (Array.isArray(items)) {
        // loaded items are plain serialized entries
        buffer = items.concat(buffer);
      }
      localStorage.removeItem(LS_KEY);
    } catch (e) {
      // ignore
    }
  };

  const saveSnapshot = () => {
    if (!cfg.persistToLocalStorage) return;
    try {
      // only persist serializable fields (avoid functions/promises)
      const serializable = buffer.map((it) => ({
        message: it.message,
        level: it.level,
        prefix: it.prefix,
        stack: it.stack,
      }));
      localStorage.setItem(LS_KEY, JSON.stringify(serializable));
    } catch (e) {
      // ignore
    }
  };

  const schedule = () => {
    if (timer || stopped) return;
    timer = setInterval(() => flush().catch(() => {}), cfg.flushIntervalMs);
  };

  const stop = async () => {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    await flush();
  };

  const start = () => {
    stopped = false;
    schedule();
  };

  const flush = async () => {
    if (buffer.length === 0) return;
  const toSend = buffer.splice(0, cfg.batchSize);
    // strip out internal deferreds for persistence
    const serializable = toSend.map((it) => ({
      message: it.message,
      level: it.level,
      prefix: it.prefix,
      stack: it.stack,
    }));
    try {
      await saveLogs(serializable);
      // resolve deferred promises for each item
      toSend.forEach((it) => {
        try {
          if (it.__deferred && typeof it.__deferred.res === "function")
            it.__deferred.res();
        } catch (e) {
          // ignore individual resolution errors
        }
      });
    } catch (e) {
      // on failure, put items back and snapshot
      buffer = toSend.concat(buffer);
      saveSnapshot();
      // reject deferred promises
      toSend.forEach((it) => {
        try {
          if (it.__deferred && typeof it.__deferred.rej === "function")
            it.__deferred.rej(e);
        } catch (er) {
          // ignore
        }
      });
      throw e;
    }
  };

  // restore any snapshot on creation
  loadSnapshot();
  schedule();

  // push returns a promise that resolves when the entry has been persisted
  const push = (entry: LogPayload): Promise<void> => {
    if (buffer.length >= cfg.maxBufferSize) {
      // drop oldest to make room
      buffer.shift();
    }
    // deferred promise for this entry
    let res: () => void = () => {};
    let rej: (err?: unknown) => void = () => {};
    const p = new Promise<void>((resolve, reject) => {
      res = resolve;
      rej = reject;
    });
    const wrapped: BufferItem = { ...entry, __deferred: { res, rej } };
    buffer.push(wrapped);
    // trigger immediate flush request (fire-and-forget)
    flush().catch(() => {});
    return p;
  };

  const makeLogger =
    (level: "info" | "debug" | "warn" | "error") => (message: string, maybeErr?: Error | string) => {
      const prefix = _cachedPrefix ?? "[KITA_LOGGING]";
      // compute stack only for error level or when provided
      let stack: string | undefined = undefined;
      if (maybeErr) {
        stack = typeof maybeErr === "string" ? maybeErr : (maybeErr as Error).stack;
      } else if (level === "error" && cfg.captureStack) {
        // synthesize a stack trace at the callsite
        try {
          const e = new Error();
          stack = e.stack;
        } catch (e) {
          stack = undefined;
        }
      }
      // truncate if necessary
      const maxChars = cfg.maxStackChars ?? 2000;
      if (stack && stack.length > maxChars) {
        stack = stack.slice(0, maxChars);
      }

      // console output immediately (include stack for error)
      if (level === "info") console.log(`${prefix} ${message}`);
      if (level === "debug") console.info(`${prefix} ${message}`);
      if (level === "warn") console.warn(`${prefix} ${message}`);
      if (level === "error") console.error(`${prefix} ${message}` + (stack ? `\n${stack}` : ""));
  return push({ message, level, prefix, stack });
    };

  return {
    info: makeLogger("info"),
    debug: makeLogger("debug"),
    warn: makeLogger("warn"),
    error: makeLogger("error"),
    flush,
    stop,
    start,
    config: cfg,
    // allow updating cached prefix from consumers
    refresh: async () => {
      _cachedPrefix = await getLogPrefix();
    },
  };
};

// create a synchronous default instance immediately
let _defaultLogger: any = createLogger();

// attempt to reconfigure with persisted options when available
const createDefault = async () => {
  try {
    const opts = await getBufferedOptions();
    // stop current logger before replacing behavior
    try {
      if (_defaultLogger && typeof _defaultLogger.stop === "function")
        await _defaultLogger.stop();
    } catch (e) {
      // ignore stop errors
    }
    const newLogger = createLogger(opts as BufferedOptions);
    // copy methods/properties onto the existing exported object so references stay valid
    Object.keys(newLogger).forEach((k) => {
      (_defaultLogger as any)[k] = (newLogger as any)[k];
    });
  } catch (e) {
    // ignore
  }
};

createDefault();

// update behavior when buffered options change at runtime
onBufferedOptionsChange((opts) => {
  (async () => {
    try {
      if (_defaultLogger && typeof _defaultLogger.stop === "function")
        await _defaultLogger.stop();
    } catch (e) {
      // ignore
    }
    const newLogger = createLogger(opts as BufferedOptions);
    Object.keys(newLogger).forEach((k) => {
      (_defaultLogger as any)[k] = (newLogger as any)[k];
    });
  })();
});

export const logger = _defaultLogger;
export default logger;

