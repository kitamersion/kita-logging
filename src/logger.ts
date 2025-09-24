import { getLogPrefix, getLogRetentionDays } from './config';
import { saveLog, deleteExpiredLogs } from './history';

const logger = {
  info: async (message: string) => {
    const prefix = await getLogPrefix();
  console.log(`${prefix} ${message}`);
  await saveLog({ message, level: 'info', prefix });
    const retention = await getLogRetentionDays();
    await deleteExpiredLogs(retention);
  },
  debug: async (message: string) => {
    const prefix = await getLogPrefix();
  console.info(`${prefix} ${message}`);
  await saveLog({ message, level: 'debug', prefix });
    const retention = await getLogRetentionDays();
    await deleteExpiredLogs(retention);
  },
  warn: async (message: string) => {
    const prefix = await getLogPrefix();
  console.warn(`${prefix} ${message}`);
  await saveLog({ message, level: 'warn', prefix });
    const retention = await getLogRetentionDays();
    await deleteExpiredLogs(retention);
  },
  error: async (message: string) => {
    const prefix = await getLogPrefix();
  console.error(`${prefix} ${message}`);
  await saveLog({ message, level: 'error', prefix });
    const retention = await getLogRetentionDays();
    await deleteExpiredLogs(retention);
  },
};

export default logger;