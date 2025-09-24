
import { LogEntry, ConfigOptions } from './types';
import { DEFAULT_RETENTION_DAYS, DB_NAME, STORE_NAME, STORE_CONFIG } from './defaults';

let db: IDBDatabase | null = null;

// milliseconds in one day
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
  const logsStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
  // index on numeric timestamp for efficient ordering/queries
  logsStore.createIndex('by_timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onerror = (event) => {
      reject(request.error);
    };
  });
};

const getDB = async (): Promise<IDBDatabase> => {
  if (db) return db;
  db = await initDB();
  return db;
};

export const saveLog = async (logEntry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const entry: LogEntry = {
    ...logEntry,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
  timestamp: Date.now(),
  timestampISO: new Date().toISOString(),
  };
  const request = store.add(entry);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveLogs = async (logEntries: Array<Omit<LogEntry, 'id' | 'timestamp'>>): Promise<void> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  // Add each entry to the store within the same transaction.
  for (let i = 0; i < logEntries.length; i++) {
    const le = logEntries[i];
    const entry: LogEntry = {
      ...le,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + String(i),
      timestamp: Date.now(),
      timestampISO: new Date().toISOString(),
  prefix: le.prefix ?? undefined,
    };
    store.add(entry);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

export const getLogs = async (): Promise<LogEntry[]> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      try {
  const result = request.result || [];
  // Ensure newest logs first (timestamp stored as epoch ms)
  result.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteExpiredLogs = async (retentionDays = DEFAULT_RETENTION_DAYS): Promise<void> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const cutoffDate = Date.now() - retentionDays * MS_PER_DAY;
  const logs = await getLogs();
  const oldLogs = logs.filter(log => log.timestamp < cutoffDate);
  
  const deletePromises = oldLogs.map(log => {
    const deleteRequest = store.delete(log.id);
    return new Promise<void>((resolve, reject) => {
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  });
  await Promise.all(deletePromises);
};

export const deleteAllLogs = async (): Promise<void> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  // Some IndexedDB polyfills or mocks may not implement `clear()`.
  // Fall back to reading all keys and deleting individually.
  const allReq = store.getAll();
  return new Promise((resolve, reject) => {
    allReq.onsuccess = async () => {
      try {
        const items = allReq.result || [];
        const deletePromises = items.map((item: any) => {
          const delReq = store.delete(item.id || item.key);
          return new Promise<void>((res, rej) => {
            delReq.onsuccess = () => res();
            delReq.onerror = () => rej(delReq.error);
          });
        });
        await Promise.all(deletePromises);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    allReq.onerror = () => reject(allReq.error);
  });
};

export const saveConfig = async (config: ConfigOptions): Promise<void> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_CONFIG], 'readwrite');
  const store = transaction.objectStore(STORE_CONFIG);
  const request = store.put({ key: 'current', ...config });
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getConfig = async (): Promise<ConfigOptions | null> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_CONFIG], 'readonly');
  const store = transaction.objectStore(STORE_CONFIG);
  const request = store.get('current');
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        const { key, ...config } = result;
        resolve(config as ConfigOptions);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};