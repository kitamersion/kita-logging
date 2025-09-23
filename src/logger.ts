import { getLogPrefix } from './config';
import { saveLog, purgeOldLogs } from './history';

const logger = {
  info: async (message: string) => {
    const prefix = await getLogPrefix();
    console.log(`${prefix} ${message}`);
    await saveLog({ message, level: 'info' });
    await purgeOldLogs();
  },
  debug: async (message: string) => {
    const prefix = await getLogPrefix();
    console.info(`${prefix} ${message}`);
    await saveLog({ message, level: 'debug' });
    await purgeOldLogs();
  },
  warn: async (message: string) => {
    const prefix = await getLogPrefix();
    console.warn(`${prefix} ${message}`);
    await saveLog({ message, level: 'warn' });
    await purgeOldLogs();
  },
  error: async (message: string) => {
    const prefix = await getLogPrefix();
    console.error(`${prefix} ${message}`);
    await saveLog({ message, level: 'error' });
    await purgeOldLogs();
  },
};

export default logger;