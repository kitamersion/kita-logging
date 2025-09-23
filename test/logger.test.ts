import { describe, it, expect, beforeEach } from 'vitest';
import './indexeddb-mock';
import logger from '../src/logger';
import * as history from '../src/history';
import * as config from '../src/config';

const clearDB = async () => {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('logHistoryDB');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
};

describe('Logger Package', () => {
  beforeEach(async () => {
    await clearDB();
  });

  it('logs info, debug, warn, and error', async () => {
    await logger.info('info test');
    await logger.debug('debug test');
    await logger.warn('warn test');
    await logger.error('error test');
    const logs = await history.getLogs();
    expect(logs.length).toBe(4);
    expect(logs.map(l => l.level)).toContain('info');
    expect(logs.map(l => l.level)).toContain('debug');
    expect(logs.map(l => l.level)).toContain('warn');
    expect(logs.map(l => l.level)).toContain('error');
  });

  it('respects log prefix from config', async () => {
    await config.setLogPrefix('[TEST_PREFIX]');
    const prefix = await config.getLogPrefix();
    expect(prefix).toBe('[TEST_PREFIX]');
  });

  it('stores and retrieves config', async () => {
    await config.setLogPrefix('[NEW_PREFIX]');
    await config.setLogRetentionDays(3);
    const conf = await config.viewCurrentConfigurations();
    expect(conf.logPrefix).toBe('[NEW_PREFIX]');
    expect(conf.logRetentionDays).toBe(3);
  });

  it('purges logs older than retention', async () => {
    await logger.info('keep');
    // Simulate an old log
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('logHistoryDB', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(['logs'], 'readwrite');
    const store = tx.objectStore('logs');
    await new Promise<void>((resolve, reject) => {
      const addReq = store.add({ id: Date.now() - 1000 * 60 * 60 * 24 * 10, message: 'old', level: 'info', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10) });
      addReq.onsuccess = () => resolve();
      addReq.onerror = () => reject(addReq.error);
    });
    await history.purgeOldLogs(7);
    const logs = await history.getLogs();
    expect(logs.some(l => l.message === 'old')).toBe(false);
    expect(logs.some(l => l.message === 'keep')).toBe(true);
  });
});
