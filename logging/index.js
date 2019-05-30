import winston from 'winston';
import dotenv from 'dotenv';

import 'winston-daily-rotate-file';

dotenv.config();

const dailyRotate = new (winston.transports.DailyRotateFile)({
  level: process.env.LOG_LEVEL || 'debug',
  filename: `${process.env.APP_DATA_ROOT}/logging/reactory-%DATE%.json`,
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.json(),
  transports: [
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
    dailyRotate,
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
export default logger;
