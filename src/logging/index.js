import * as winston from 'winston';
import * as dotenv from 'dotenv';

import 'winston-daily-rotate-file';

const { format, transports } = winston;

const { combine, timestamp, label, prettyPrint } = format;

dotenv.config();

const dailyRotate = new (transports.DailyRotateFile)({
  level: process.env.LOG_LEVEL || 'debug',
  filename: `${process.env.APP_DATA_ROOT}/logging/reactory-%DATE%.json`,
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const consolelogger = new (transports.Console)({
  level: 'debug',
  format: format.simple(),
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(    
    timestamp(),
    prettyPrint()
  ),
  transports: [
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
    consolelogger,
    dailyRotate,
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  // logger.add();
}
export default logger;
