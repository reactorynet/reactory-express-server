import * as winston from "winston";
import "winston-daily-rotate-file";
import { existsSync, mkdirSync } from "fs";
import * as DailyRotateFileTransport from "winston-daily-rotate-file";

/**
 * Creates a logger instance
 * @returns 
 */
export const getLogging = () => {
  const { APP_DATA_ROOT } = process.env;
  if (!APP_DATA_ROOT) throw new Error("APP_DATA_ROOT is not defined, please check your .env file");
  if (!existsSync(APP_DATA_ROOT)) throw new Error("APP_DATA_ROOT does not exist, please check your .env file");
  if (!existsSync(`${APP_DATA_ROOT}/logging`)) mkdirSync(`${APP_DATA_ROOT}/logging`);

  const { format, transports } = winston;

  const { combine, timestamp, label, prettyPrint } = format;

  const file_logging_options: DailyRotateFileTransport.DailyRotateFileTransportOptions =
    {
      level: process.env.LOG_LEVEL || "debug",
      filename: `${process.env.APP_DATA_ROOT}/logging/reactory-%DATE%.json`,
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
    };

  //@ts-ignore
  const dailyRotate = new winston.transports.DailyRotateFile(
    file_logging_options
  );

  const consolelogger = new transports.Console({
    level: "debug",
    format: format.simple(),
  });

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "debug",
    format: combine(timestamp(), label(), prettyPrint()),
    transports: [consolelogger, dailyRotate],
  });

  return logger;
};

export default getLogging();
