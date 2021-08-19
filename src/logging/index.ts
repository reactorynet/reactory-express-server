import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as DailyRotateFileTransport from 'winston-daily-rotate-file';

const { format, transports } = winston;

const { combine, timestamp, label, prettyPrint } = format;

const file_logging_options: DailyRotateFileTransport.DailyRotateFileTransportOptions = {
  level: process.env.LOG_LEVEL || 'debug',
  filename: `${process.env.APP_DATA_ROOT}/logging/reactory-%DATE%.json`,
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
}

//@ts-ignore
const dailyRotate = new winston.transports.DailyRotateFile(file_logging_options);

const consolelogger = new (transports.Console)({
  level: 'debug',
  format: format.simple(),
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(
    timestamp(),
    label(),
    prettyPrint()
  ),
  transports: [
    consolelogger,
    dailyRotate,
  ],
});


if (process.env.NODE_ENV !== 'production') {
  // logger.add();
}
export default logger;
