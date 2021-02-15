// eslint-disable
import fs from 'fs';
import dotenv from 'dotenv';
import moment from 'moment';
import cors from 'cors';
import path from 'path';
import https from 'https';
import sslrootcas from 'ssl-root-cas/latest';
import express, { Application } from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import passport from 'passport';
import { ApolloServer, gql, ApolloServerExpressConfig } from 'apollo-server-express';
import flash from 'connect-flash';
import mongooseConnection from './mongoose';
import corsOptions from './config/cors';
import reactoryClientAuthenticationMiddleware from './middleware/ReactoryClient';
import userAccountRouter from './useraccount';
import reactory from './reactory';
import froala from './froala';
import charts from './charts';
import resources from './resources';
import typeDefs from './models/graphql/types';
import resolvers from './models/graphql/resolvers';
import AuthConfig from './authentication';
import workflow from './workflow';
import uuid from 'uuid';
import pdf from './pdf';
import { ExcelRouter } from './excel';
import amq from './amq';
// import bots from './bot/server';
import startup from './utils/startup';
import { getService } from './services';
import logger from './logging';
import { split } from 'lodash';
import { Reactory } from 'types/reactory';


const {
  APP_DATA_ROOT,
  APP_SYSTEM_FONTS,
  MONGOOSE,
  MONGO_USER,
  MONGO_PASSWORD,
  API_PORT,
  API_URI_ROOT,
  CDN_ROOT,
  MODE,
  NODE_ENV,
  DOMAIN_NAME,
  OAUTH_APP_ID,
  OAUTH_APP_PASSWORD,
  OAUTH_REDIRECT_URI,
  OAUTH_SCOPES,
  OAUTH_AUTHORITY,
  OAUTH_ID_METADATA,
  OAUTH_AUTHORIZE_ENDPOINT,
  OAUTH_TOKEN_ENDPOINT,
  SECRET_SAUCE,
  SERVER_ID,
  MAX_FILE_UPLOAD = '20mb',
} = process.env;

mongooseConnection.then(() => {
  logger.debug('✅Connection to mongoose complete');
}).catch((error: Error) => {

  logger.error(`
  ################################################
  💥Could not connect to mongoose - shutting down
  server process. Check if the configuration 
  settings below are correct and whether your user 
  mongo db account exists on the target database
  ################################################
  db: ${MONGOOSE}
  user: ${MONGO_USER || '!!NOT-SET!!'}
  pass: ${MONGO_PASSWORD ? '****' : '!!NOT-SET!!'}
  err: ${error.messagte}
  ################################################

  `);
  process.exit(0);
});

const ca = sslrootcas.create();
https.globalAgent.options.ca = ca;

const packageJson = require('../package.json');

dotenv.config();

process.on('unhandledRejection', (error) => {
  // Will print "unhandledRejection err is not defined"
  logger.error('unhandledRejection', error);
  throw error;
});

process.on('SIGINT', () => {
  logger.info('Shutting down server');
  process.exit(0);
});

let asciilogo = `Reactory Server version : ${packageJson.version} - start ${moment().format('YYYY-MM-dd HH:mm:ss')}`;

if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`)) {
  const logo = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`, { encoding: 'utf-8' });
  asciilogo = `${asciilogo}\n\n${logo}`;
}

let asterisks = '';
for (let si: number = 0; si < SECRET_SAUCE.length - 2; si += 1) { asterisks = `${asterisks}*` };

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
  SECRET_SAUCE: '${SECRET_SAUCE.substr(0, 1)}${asterisks}${SECRET_SAUCE.substr(SECRET_SAUCE.length - 1, 1)}',
  
  =========================================
         Microsoft OAuth2 Settings
  =========================================
  OAUTH_APP_ID: ${OAUTH_APP_ID}
  OAUTH_APP_PASSWORD: ${OAUTH_APP_PASSWORD}
  OAUTH_REDIRECT_URI: ${OAUTH_REDIRECT_URI}
  OAUTH_SCOPES: ${OAUTH_SCOPES}
  OAUTH_AUTHORITY: ${OAUTH_AUTHORITY}
  OAUTH_ID_METADATA: ${OAUTH_ID_METADATA}
  OAUTH_AUTHORIZE_ENDPOINT: ${OAUTH_AUTHORIZE_ENDPOINT}
  OAUTH_TOKEN_ENDPOINT: ${OAUTH_TOKEN_ENDPOINT}
  =========================================  
`;

logger.info(ENV_STRING_DEBUG);

const queryRoot = '/api';
const resourcesPath = '/cdn';
const publicFolder = path.join(__dirname, 'public');

let apolloServer: ApolloServer = null;
let graphcompiled: boolean = false;
let graphError: String = '';

const reactoryExpress: Application = express();

reactoryExpress.use('*', cors(corsOptions));
reactoryExpress.use(reactoryClientAuthenticationMiddleware);
reactoryExpress.use(queryRoot,
  // authentication
  passport.authenticate(['jwt', 'anonymous'], { session: false }), bodyParser.urlencoded({ extended: true }),
  bodyParser.json({ limit: MAX_FILE_UPLOAD }));

try {
  //app.use(queryRoot, graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));
  let expressConfig: ApolloServerExpressConfig = {
    typeDefs,
    resolvers,
    context: async ($session: any, currentContext: any) => {

      let newContext: any = {
        ...currentContext,
        user: $session.req.user,
        partner: $session.req.partner,
        $request: $session.req,
        $response: $session.res,
      };

      const $getService = (id: string, props: any = undefined) => {
        return getService(id, props, {
          ...newContext,
          getService: $getService,
        });
      };

      const executionContextServiceName = newContext.partner.getSetting('execution_context_service');
      if (executionContextServiceName && executionContextServiceName.data && `${executionContextServiceName.data}`.indexOf('@') > 0) {
        const partnerContextService: Reactory.IExecutionContextProvider = $getService(executionContextServiceName.data);
        if (partnerContextService && partnerContextService.getContext) {
          newContext = await partnerContextService.getContext(newContext).then();
        }
      }

      return {
        id: uuid(),
        ...newContext,
        getService: $getService,
      };
    },
    uploads: {
      maxFileSize: 20000000,
      maxFiles: 10,
    },
  };
  apolloServer = new ApolloServer(expressConfig);
  graphcompiled = true;
  logger.info('Graph Schema Compiled, starting express');
} catch (schemaCompilationError) {
  if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`)) {
    const error = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`, { encoding: 'utf-8' });
    logger.error(`\n\n${error}`);
  }

  graphError = `Error compiling the graphql schema ${schemaCompilationError.message}`;
  logger.error(graphError);
}

reactoryExpress.set('trust proxy', NODE_ENV == "development" ? 0 : 1);

// TODO: Werner Weber - investigate session and session management for auth.
const sessionOptions: session.SessionOptions = {
  // name: "connect.sid",
  secret: SECRET_SAUCE,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
  // proxy: NODE_ENV === 'development' ? false : true,
  cookie: {
    domain: DOMAIN_NAME,
    maxAge: 60 * 5 * 1000,
    // httpOnly: NODE_ENV === 'development' ? true : false,
    // sameSite: 'lax',
    // secure: NODE_ENV === 'development' ? false : true,
  },
};

logger.debug('Session Configuration', sessionOptions);

const oldOptions = {
  secret: SECRET_SAUCE,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
};

reactoryExpress.use(session(oldOptions));
reactoryExpress.use(bodyParser.urlencoded({ extended: false }));
reactoryExpress.use(bodyParser.json({ limit: '20mb' }));

if (apolloServer) {
  apolloServer.applyMiddleware({ app: reactoryExpress, path: queryRoot });
} else {
  if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`)) {
    const error = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`, { encoding: 'utf-8' });
    logger.error(`\n\n${error}`);
  }
  logger.error(`Error compiling the graphql schema: apolloServer instance is null!`);
}


amq.raiseSystemEvent('server.startup.begin');

// TODO: Werner Weber - Update the start result object to contain
// more useful information about the server environment, configuration
// output.
startup().then((startResult: any) => {

  AuthConfig.Configure(reactoryExpress);
  reactoryExpress.use(userAccountRouter);
  reactoryExpress.use('/reactory', reactory);
  reactoryExpress.use('/froala', froala);
  reactoryExpress.use('/deliveries', froala);
  reactoryExpress.use('/workflow', workflow);
  reactoryExpress.use('/resources', resources);
  reactoryExpress.use('/pdf', passport.authenticate(
    ['jwt'], { session: false }),
    bodyParser.urlencoded({ extended: true }), pdf);
  reactoryExpress.use('/excel', ExcelRouter);
  reactoryExpress.use('/charts', charts);
  reactoryExpress.use('/amq', amq.router);
  reactoryExpress.use(resourcesPath,
    passport.authenticate(['jwt', 'anonymous'], { session: false }),
    bodyParser.urlencoded({ extended: true }),
    express.static(APP_DATA_ROOT || publicFolder));
  reactoryExpress.listen(API_PORT);
  reactoryExpress.use(flash());

  logger.info(asciilogo);
  if (graphcompiled === true) logger.info(`✅ Running a GraphQL API server at ${API_URI_ROOT}${queryRoot}`);
  else logger.info(`🩺 GraphQL API not available - ${graphError}`);

  logger.info('✅ System Initialized/Ready, enabling app');
  global.REACTORY_SERVER_STARTUP = new Date();
  amq.raiseSystemEvent('server.startup.complete');
}).catch((startupError) => {
  logger.error('Server was unable to start successfully.', startupError);
  process.exit(0);
});
