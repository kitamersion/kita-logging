import { saveConfig, getConfig } from './history';
import { DEFAULT_LOG_PREFIX, DEFAULT_RETENTION_DAYS } from './defaults';

let logPrefix = DEFAULT_LOG_PREFIX;
let logRetentionDays = DEFAULT_RETENTION_DAYS;
let configLoaded = false;

const loadConfig = async () => {
  if (configLoaded) return;
  const stored = await getConfig();
  if (stored) {
    logPrefix = stored.logPrefix;
    logRetentionDays = stored.logRetentionDays;
  }
  configLoaded = true;
};

export const setLogPrefix = async (prefix: string) => {
  await loadConfig();
  logPrefix = prefix;
  await saveConfig({ logPrefix, logRetentionDays });
};

export const getLogPrefix = async () => {
  await loadConfig();
  return logPrefix;
};

export const setLogRetentionDays = async (days: number) => {
  await loadConfig();
  logRetentionDays = days;
  await saveConfig({ logPrefix, logRetentionDays });
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
  };
};