import * as winston from 'winston';
import * as dotenv from 'dotenv';

import 'winston-daily-rotate-file';

dotenv.config();

const dailyRotate = new (winston.transports.DailyRotateFile)({
  level: process.env.LOG_LEVEL || 'debug',
  filename: `${process.env.APP_DATA_ROOT}/testing/reactory-%DATE%.json`,
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '5d',
});

const consolelogger = new (winston.transports.Console)({
  level: 'debug',
  format: winston.format.simple(),
});

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  transports: [
    consolelogger,
    dailyRotate,
  ],
});

if (process.env.NODE_ENV !== 'production') {
  // logger.add();
}

export default logger;
