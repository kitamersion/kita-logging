import { getLogPrefix } from './config';
import { saveLogs } from './history';

// Buffered, fire-and-forget logger implementation.
export type BufferedOptions = {
  flushIntervalMs?: number;
  batchSize?: number;
  maxBufferSize?: number;
  persistToLocalStorage?: boolean;
};

const DEFAULT_BUFFERED: Required<BufferedOptions> = {
  flushIntervalMs: 2000,
  batchSize: 50,
  maxBufferSize: 5000,
  persistToLocalStorage: true,
};

const LS_KEY = 'kita_logging_buffer_snapshot_v1';

let _cachedPrefix: string | null = null;
// initialize prefix in background
(async () => {
  try {
    _cachedPrefix = await getLogPrefix();
  } catch (e) {
    _cachedPrefix = null;
  }
})();

export const createBufferedLogger = (opts?: BufferedOptions) => {
  const cfg = { ...DEFAULT_BUFFERED, ...(opts || {}) };
  let buffer: Array<Omit<any, 'id' | 'timestamp'>> = [];
  let timer: any = null;
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
      const serializable = buffer.map((it: any) => ({ message: it.message, level: it.level, prefix: it.prefix }));
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
    const serializable = toSend.map((it: any) => ({ message: it.message, level: it.level, prefix: it.prefix }));
    try {
      await saveLogs(serializable as any);
      // resolve deferred promises for each item
      toSend.forEach((it: any) => {
        try {
          if (it.__deferred && typeof it.__deferred.res === 'function') it.__deferred.res();
        } catch (e) {
          // ignore individual resolution errors
        }
      });
    } catch (e) {
      // on failure, put items back and snapshot
      buffer = toSend.concat(buffer);
      saveSnapshot();
      // reject deferred promises
      toSend.forEach((it: any) => {
        try {
          if (it.__deferred && typeof it.__deferred.rej === 'function') it.__deferred.rej(e);
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
  const push = (entry: Omit<any, 'id' | 'timestamp'>): Promise<void> => {
    if (buffer.length >= cfg.maxBufferSize) {
      // drop oldest to make room
      buffer.shift();
    }
    // deferred promise for this entry
    let res: () => void = () => {};
    let rej: (err?: any) => void = () => {};
    const p = new Promise<void>((resolve, reject) => {
      res = resolve;
      rej = reject;
    });
    const wrapped: any = { ...entry, __deferred: { res, rej } };
    buffer.push(wrapped);
    // trigger immediate flush request (fire-and-forget)
    flush().catch(() => {});
    return p;
  };

  const makeLogger = (level: 'info' | 'debug' | 'warn' | 'error') => (message: string) => {
    const prefix = _cachedPrefix ?? '[KITA_LOGGING]';
    // console output immediately
    if (level === 'info') console.log(`${prefix} ${message}`);
    if (level === 'debug') console.info(`${prefix} ${message}`);
    if (level === 'warn') console.warn(`${prefix} ${message}`);
    if (level === 'error') console.error(`${prefix} ${message}`);
  return push({ message, level, prefix });
  };

  return {
    info: makeLogger('info'),
    debug: makeLogger('debug'),
    warn: makeLogger('warn'),
    error: makeLogger('error'),
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

// default instance with defaults
export const bufferedLogger = createBufferedLogger();

// Common default export used by tests and consumers importing the module directly
export default bufferedLogger;