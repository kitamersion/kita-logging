
import { LogEntry, ConfigOptions } from './types';
import { DEFAULT_RETENTION_DAYS, DB_NAME, STORE_NAME, STORE_CONFIG } from './defaults';

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
    timestamp: new Date()
  };
  const request = store.add(entry);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getLogs = async (): Promise<LogEntry[]> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const purgeOldLogs = async (retentionDays = DEFAULT_RETENTION_DAYS): Promise<void> => {
  const db = await getDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
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