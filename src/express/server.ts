'use strict'
import fs from 'fs';
import moment from 'moment';
import path from 'path';
import https from 'https';
// @ts-ignore
import sslrootcas from 'ssl-root-cas/latest';
import express, { Application } from 'express';
import mongooseConnection from '@reactory/server-core/models/mongoose';
import configureMiddleWare from '@reactory/server-core/express/middleware';
import { ConfigureAuthentication } from '@reactory/server-core/authentication';
import { workflowRunner, WorkFlowRunner } from '@reactory/server-core/workflow';
import amq from '@reactory/server-core/amq';
import startup from '@reactory/server-core/utils/startup';
import logger from '@reactory/server-core/logging';
import ConfigureRoutes from '@reactory/server-core/express/routes';
import ConfigureViews from '@reactory/server-core/express/views';
import colors from 'colors/safe';
import http from 'http';

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
  SECRET_SAUCE,
  SERVER_ID,
  MAX_FILE_UPLOAD = '20mb',
  DEVELOPER_ID,
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
  workflowHost: WorkFlowRunner,
  stop: () => void
}> => {

  const reactoryExpress: Application = express();
  const httpServer: http.Server = http.createServer(reactoryExpress);
  const resourcesPath = '/cdn';
  const publicFolder = path.join(__dirname, 'public');

  
  let mongoose_result = null;

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
    process.exit(0);
  }

  process.on('unhandledRejection', (error) => {
    // Will print "unhandledRejection err is not defined"
    logger.error('unhandledRejection', error);
    process.exit(0);
  });

  process.on('SIGINT', () => {
    workflowRunner.stop();
    logger.info('Shutting Down Reactory Server');
    process.exit(0);
  });

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

  process.once('SIGUSR2', function () {
    if (httpServer) {
      logger.debug(colors.magenta('Interrupt Received, restarting'));
      httpServer.close(() => {
        process.kill(process.pid, 'SIGUSR2')
      })
    }
  })

  process.on("SIGINT", () => {
    if (httpServer) {
      console.log('Shutting down server');
      httpServer.close(() => {
        process.exit(0);
      })
    }
  });
      
  
  configureMiddleWare(reactoryExpress, httpServer);

  amq.raiseSystemEvent('server.startup.begin', {});

  if (SYSTEM_USER_ID === 'not-set') {
    logger.warn(colors.yellow("SYSTEM_USER_ID env variable is not set - please configure in env variables"));
  }

  // TODO: Werner Weber - Update the start result object to contain
  // more useful information about the server environment, configuration
  // output.
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

    const stopServer = () => { 
      if(httpServer) { 
        httpServer.close(() => {
          logger.info('Express Server Stopped');
        });
      }
      if(workflowRunner) {
        workflowRunner.stop();
        logger.info('Workflow Host Stopped');
      }
      if(mongoose_result) {
        mongoose_result.connection.close();
        logger.info('Mongoose Connection Closed');
      }
    };

    try {
      await startExpressServer();
    } catch (error) {
      logger.error(colors.red('Could not start the express server'), error);
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
    process.exit(-1);
  }
}