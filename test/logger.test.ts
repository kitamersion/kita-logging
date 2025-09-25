import { describe, it, expect, beforeEach } from "vitest";
import "./indexeddb-mock";
import logger from "../src/logger";
import * as history from "../src/history";
import * as config from "../src/config";

const clearDB = async () => {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase("logHistoryDB");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
};

describe("Logger Package", () => {
  beforeEach(async () => {
    await clearDB();
  });

  it("logs info, debug, warn, and error", async () => {
    // buffered logger is fire-and-forget; log and then flush to persist
    logger.info("info test");
    logger.debug("debug test");
    logger.warn("warn test");
    logger.error("error test");
    await logger.flush();
    const logs = await history.getLogs();
    expect(logs.length).toBe(4);
    expect(logs.map((l) => l.level)).toContain("info");
    expect(logs.map((l) => l.level)).toContain("debug");
    expect(logs.map((l) => l.level)).toContain("warn");
    expect(logs.map((l) => l.level)).toContain("error");
    // ensure prefix was stored with each log
    expect(logs.every((l) => typeof l.prefix === "string")).toBe(true);
  });

  it("respects log prefix from config", async () => {
    await config.setLogPrefix("[TEST_PREFIX]");
    const prefix = await config.getLogPrefix();
    expect(prefix).toBe("[TEST_PREFIX]");
  });

  it("stores and retrieves config", async () => {
    await config.setLogPrefix("[NEW_PREFIX]");
    await config.setLogRetentionDays(3);
    const conf = await config.viewCurrentConfigurations();
    expect(conf.logPrefix).toBe("[NEW_PREFIX]");
    expect(conf.logRetentionDays).toBe(3);
  });

  it("purges logs older than retention", async () => {
    logger.info("keep");
    await logger.flush();
    // Simulate an old log
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("logHistoryDB", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(["logs"], "readwrite");
    const store = tx.objectStore("logs");
    await new Promise<void>((resolve, reject) => {
      const ts = Date.now() - 1000 * 60 * 60 * 24 * 10;
      const addReq = store.add({
        id: ts,
        message: "old",
        level: "info",
        timestamp: ts,
        prefix: "[KITA_LOGGING]",
      });
      addReq.onsuccess = () => resolve();
      addReq.onerror = () => reject(addReq.error);
    });
    await history.deleteExpiredLogs(7);
    const logs = await history.getLogs();
    expect(logs.some((l) => l.message === "old")).toBe(false);
    expect(logs.some((l) => l.message === "keep")).toBe(true);
  });

  it("deleteAllLogs removes all logs", async () => {
    logger.info("one");
    logger.info("two");
    await logger.flush();
    let logs = await history.getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(2);
    await history.deleteAllLogs();
    logs = await history.getLogs();
    expect(logs.length).toBe(0);
  });

  it("stores stack when logging an Error", async () => {
    const err = new Error("boom-test");
    logger.error("caught error", err);
    await logger.flush();
    const logs = await history.getLogs();
  const e = logs.find((l) => l.level === "error" && l.message === "caught error");
  expect(e).toBeTruthy();
  expect(typeof e!.stack).toBe("string");
  expect(e!.stack).toContain("boom-test");
  });
});
