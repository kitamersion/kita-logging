import { saveConfig, getConfig } from "./history";
import {
  DEFAULT_LOG_PREFIX,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_BUFFERED_OPTIONS,
} from "./defaults";
import type { BufferedOptions, ConfigOptions } from "./types";

let logPrefix = DEFAULT_LOG_PREFIX;
let logRetentionDays = DEFAULT_RETENTION_DAYS;
let bufferedOptions: BufferedOptions | undefined = DEFAULT_BUFFERED_OPTIONS;
let configLoaded = false;
// Listeners for buffered options changes (e.g., the logger can reconfigure itself)
const bufferedListeners: Array<(opts: BufferedOptions) => void> = [];

export const onBufferedOptionsChange = (
  fn: (opts: BufferedOptions) => void,
): (() => void) => {
  bufferedListeners.push(fn);
  return () => {
    const idx = bufferedListeners.indexOf(fn);
    if (idx >= 0) bufferedListeners.splice(idx, 1);
  };
};

const loadConfig = async () => {
  if (configLoaded) return;
  const stored = await getConfig();
  if (stored) {
    logPrefix = stored.logPrefix;
    logRetentionDays = stored.logRetentionDays;
    bufferedOptions = stored.bufferedOptions || DEFAULT_BUFFERED_OPTIONS;
  }
  configLoaded = true;
  // notify any listeners that buffered options are available
  bufferedListeners.forEach((fn) => fn(bufferedOptions!));
};

export const setLogPrefix = async (prefix: string) => {
  await loadConfig();
  logPrefix = prefix;
  await saveConfig({ logPrefix, logRetentionDays, bufferedOptions });
};

export const getLogPrefix = async () => {
  await loadConfig();
  return logPrefix;
};

export const setLogRetentionDays = async (days: number) => {
  await loadConfig();
  logRetentionDays = days;
  await saveConfig({ logPrefix, logRetentionDays, bufferedOptions });
};

export const setBufferedOptions = async (opts: BufferedOptions) => {
  await loadConfig();
  bufferedOptions = { ...DEFAULT_BUFFERED_OPTIONS, ...(opts || {}) };
  await saveConfig({ logPrefix, logRetentionDays, bufferedOptions });
};

export const getBufferedOptions = async (): Promise<BufferedOptions> => {
  await loadConfig();
  return bufferedOptions || DEFAULT_BUFFERED_OPTIONS;
};

export const getLogRetentionDays = async () => {
  await loadConfig();
  return logRetentionDays;
};

export const viewCurrentConfigurations = async () => {
  await loadConfig();
  return {
    logPrefix,
    logRetentionDays,
  bufferedOptions,
  };
};

