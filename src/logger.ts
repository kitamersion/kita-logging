import { getLogPrefix, getLogRetentionDays } from './config';
import { saveLog, purgeOldLogs } from './history';

const logger = {
  info: async (message: string) => {
    const prefix = await getLogPrefix();
    console.log(`${prefix} ${message}`);
    await saveLog({ message, level: 'info' });
    const retention = await getLogRetentionDays();
    await purgeOldLogs(retention);
  },
  debug: async (message: string) => {
    const prefix = await getLogPrefix();
    console.info(`${prefix} ${message}`);
    await saveLog({ message, level: 'debug' });
    const retention = await getLogRetentionDays();
    await purgeOldLogs(retention);
  },
  warn: async (message: string) => {
    const prefix = await getLogPrefix();
    console.warn(`${prefix} ${message}`);
    await saveLog({ message, level: 'warn' });
    const retention = await getLogRetentionDays();
    await purgeOldLogs(retention);
  },
  error: async (message: string) => {
    const prefix = await getLogPrefix();
    console.error(`${prefix} ${message}`);
    await saveLog({ message, level: 'error' });
    const retention = await getLogRetentionDays();
    await purgeOldLogs(retention);
  },
};

export default logger;