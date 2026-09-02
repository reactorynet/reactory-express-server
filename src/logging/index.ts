import * as winston from "winston";
import "winston-daily-rotate-file";
import { existsSync, mkdirSync } from "fs";
import * as DailyRotateFileTransport from "winston-daily-rotate-file";

/**
 * Creates a logger instance
 * @returns 
 */
export const getLogging = () => {
  let APP_DATA_ROOT = process.env.APP_DATA_ROOT || process.env.REACTORY_DATA || "/reactory/reactory-data";
  const { REACTORY_IS_BUILDING = 'false' } = process.env;
  if (REACTORY_IS_BUILDING === 'true') {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'debug',
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console(),
      ],
    });
  }
  if (!existsSync(APP_DATA_ROOT)) {
    try {
      mkdirSync(APP_DATA_ROOT, { recursive: true });
    } catch (e) {}
  }
  if (!existsSync(`${APP_DATA_ROOT}/logging`)) {
    try {
      mkdirSync(`${APP_DATA_ROOT}/logging`, { recursive: true });
    } catch (e) {}
  }

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
    // Honour LOG_LEVEL for the console (was hard-coded to "debug", which drowned
    // CLI/server output in per-service registration and workflow-load lines
    // regardless of configuration). Default stays "debug" for parity.
    level: process.env.LOG_LEVEL || "debug",
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
