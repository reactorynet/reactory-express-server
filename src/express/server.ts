'use strict'
import fs from 'fs';
import moment from 'moment';
import https from 'https';
import sslrootcas from 'ssl-root-cas/latest';
import express, { Application } from 'express';
import mongooseConnection from '@reactory/server-core/models/mongoose';
import configureMiddleWare from '@reactory/server-core/express/middleware';
import { ConfigureAuthentication } from '@reactory/server-core/authentication';
import { workflowRunner, WorkflowRunner } from '@reactory/server-modules/reactory-core/workflow/WorkflowRunner/WorkflowRunner';
import amq from '@reactory/server-core/amq';
import startup from '@reactory/server-core/utils/startup';
import logger from '@reactory/server-core/logging';
import ConfigureRoutes from '@reactory/server-core/express/routes';
import ConfigureViews from '@reactory/server-core/express/views';
import colors from 'colors/safe';
import http from 'http';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';

// set theme
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});


const {
  APP_DATA_ROOT,
  APP_SYSTEM_FONTS,
  MONGOOSE,
  MONGO_USER,
  MONGO_PASSWORD,
  API_PORT = 4000,
  SERVER_IP,
  API_URI_ROOT,
  CDN_ROOT,
  MODE,
  NODE_ENV = 'development',
  DOMAIN_NAME,
  SERVER_ID,
  MAX_FILE_UPLOAD = '20mb',
  SYSTEM_USER_ID = 'not-set',
  MAIL_REDIRECT_ADDRESS
} = process.env as Reactory.Server.ReactoryEnvironment;

/**
 * Helper function to hide text we don't want to log to 
 * output or log files.
 * @param text 
 * @returns 
 */
const hideText = (text: string = '') => {
  let asterisks = '';
  for (let ai: number = 0; ai < text.length - 2; ai += 1) {
    asterisks = `${asterisks}*`;
  }
  return `${text.substr(0, 1)}${asterisks}${text.substr(text.length - 1, 1)}}`;
};


/**
 * The main function to start reactory server. 
 */
export const ReactoryServer = async (): Promise<{ 
  app: Application, 
  server: http.Server,
  workflowHost: WorkflowRunner,
  stop: () => void
}> => {

  const reactoryExpress: Application = express();
  const httpServer: http.Server = http.createServer(reactoryExpress);
  
  let mongoose_result = null;
  let stopServer: (() => Promise<void>) | null = null;
  let isStopping = false;

  const stopForSignal = async (signal: NodeJS.Signals, restart = false) => {
    if (isStopping) {
      return;
    }

    isStopping = true;
    logger.info(`Received ${signal}; shutting down Reactory Server`);
    try {
      await stopServer?.();
    } catch (error) {
      logger.error('Graceful server shutdown failed', error);
    }

    if (process.env.REACTORY_RUNTIME !== 'electron') {
      if (restart) {
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    }
  };

  const ca = sslrootcas.create();
  https.globalAgent.options.ca = ca;

  const packageJson = require(`${process.cwd()}/package.json`);

  try {
    mongoose_result = await mongooseConnection();
    logger.debug('✅Connection to mongoose complete');
  } catch (error) {
    logger.error(colors.red(`
  ################################################
  💥Could not connect to mongoose - shutting down
  server process. Check if the configuration 
  settings below are correct and whether your user 
  mongo db account exists on the target database
  ################################################
  db: ${MONGOOSE}
  user: ${MONGO_USER || '!!NOT-SET!!'}
  pass: ${MONGO_PASSWORD ? hideText(MONGO_PASSWORD) : '!!NOT-SET!!'}
  err: ${error.message}
  ################################################
  `));
    if (process.env.REACTORY_RUNTIME === 'electron') {
      throw new Error('Could not connect to MongoDB');
    }
    process.exit(0);
  }

  process.on('unhandledRejection', (error) => {
    // Will print "unhandledRejection err is not defined"
    logger.error('unhandledRejection', error);
    // Electron manages the process lifecycle itself — don't exit under it.
    if (process.env.REACTORY_RUNTIME !== 'electron') {
      process.exit(0);
    }
  });

  process.once('SIGINT', () => void stopForSignal('SIGINT'));
  process.once('SIGTERM', () => void stopForSignal('SIGTERM'));

  let asciilogo = `Reactory Server version : ${packageJson.version} - start ${moment().format('YYYY-MM-dd HH:mm:ss')}`;

  if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`)) {
    const logo = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`, { encoding: 'utf-8' });
    asciilogo = `${asciilogo}\n\n${logo}`;
  }

  const ENV_STRING_DEBUG = `
Environment Settings: 
  NODE_ENV: ${NODE_ENV}
  SERVER_ID: ${SERVER_ID || 'reactory.local'}
  APP_DATA_ROOT: ${APP_DATA_ROOT}
  APP_SYSTEM_FONTS: ${APP_SYSTEM_FONTS}
  API_PORT: ${API_PORT}
  API_URI_ROOT: ${API_URI_ROOT}
  CDN_ROOT: ${CDN_ROOT}
  DOMAIN_NAME: ${DOMAIN_NAME}
  MODE: ${MODE}
  MONGOOSE: ${MONGOOSE}
  MAX_FILE_UPLOAD (size): ${MAX_FILE_UPLOAD} !NOTE! This affects all file uploads.
  MAIL_REDIRECT_ADDRESS: ${MAIL_REDIRECT_ADDRESS}
`;

  logger.debug(ENV_STRING_DEBUG);

  reactoryExpress.on('error', (app) => {
    logger.error(`Application reported error`);
  });

  // nodemon restart signal — not applicable when Electron owns the process lifecycle.
  if (process.env.REACTORY_RUNTIME !== 'electron') {
    process.once('SIGUSR2', function () {
      if (httpServer) {
        logger.debug(colors.magenta('Interrupt Received, restarting'));
        void stopForSignal('SIGUSR2', true);
      }
    })
  }
      
  
  configureMiddleWare(reactoryExpress, httpServer);

  amq.raiseSystemEvent('server.startup.begin', {});

  if (SYSTEM_USER_ID === 'not-set') {
    logger.warn(colors.yellow("SYSTEM_USER_ID env variable is not set - please configure in env variables"));
  }

  try {
    const context = await startup();
    ConfigureAuthentication(reactoryExpress);
    ConfigureRoutes(reactoryExpress);
    ConfigureViews(reactoryExpress);
    const startExpressServer = async (): Promise<http.Server> => {
      return new Promise((resolve, reject) => {
        httpServer.listen(typeof API_PORT === "string" ? parseInt(API_PORT) : API_PORT, SERVER_IP, () => {
          logger.info(`\n\n${asciilogo}\n\n`);
          logger.info(colors.green('✅ System Initialized/Ready, enabling app'));
          global.REACTORY_SERVER_STARTUP = new Date();
          amq.raiseSystemEvent('server.startup.complete');
          resolve(httpServer);
        }).on("error", (err) => {
          logger.error(colors.red("Could not successfully start the express server"), err);
          reject(err);
        });
      });
    };

    stopServer = async () => {
      try {
        // @ts-ignore onShutdown is a model static
        await ReactoryClient.onShutdown(context);
      } catch (error) {
        logger.error('Client configuration shutdown failed', error);
      }
      if(workflowRunner) {
        await workflowRunner.stop();
        logger.info('Workflow Host Stopped');
      }
      if(httpServer) {
        await new Promise<void>((resolve) => {
          httpServer.close(() => {
            logger.info('Express Server Stopped');
            resolve();
          });
        });
      }
      if(mongoose_result) {
        await mongoose_result.connection.close();
        logger.info('Mongoose Connection Closed');
      }
    };

    try {
      await startExpressServer();
    } catch (error) {
      logger.error(colors.red('Could not start the express server'), error);
      if (process.env.REACTORY_RUNTIME === 'electron') {
        throw error;
      }
      process.exit(-1);
    }

    return { 
      app: reactoryExpress,
      server: httpServer,
      workflowHost: workflowRunner,
      stop: stopServer
    }
  } catch (startupError) {
    logger.error(colors.red('Server was unable to start successfully.'), startupError);
    if (process.env.REACTORY_RUNTIME === 'electron') {
      throw startupError;
    }
    process.exit(-1);
  }
}