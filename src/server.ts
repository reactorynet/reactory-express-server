import fs from 'fs';
// @ts-ignore
import dotenv from 'dotenv';
import moment from 'moment';
import cors from 'cors';
import path from 'path';
import https from 'https';
// @ts-ignore
import sslrootcas from 'ssl-root-cas/latest';
import express, { Application } from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import passport from 'passport';
import { ApolloServer, ApolloServerExpressConfig } from 'apollo-server-express';
import uuid from 'uuid';
import flash from 'connect-flash';
/**
 * Disabling the linting for the import statements
 * as eslint is not configure to deal with the
 * correct aliasing configured in tsconfig and package.json
 */
import mongooseConnection from '@reactory/server-core/mongoose'; // eslint-disable-line
import corsOptions from '@reactory/server-core/config/cors'; // eslint-disable-line
import reactoryClientAuthenticationMiddleware from '@reactory/server-core/middleware/ReactoryClient'; // eslint-disable-line
import userAccountRouter from '@reactory/server-core/useraccount'; // eslint-disable-line
import reactory from '@reactory/server-core/reactory'; // eslint-disable-line
import froala from '@reactory/server-core/froala'; // eslint-disable-line
import charts from '@reactory/server-core/charts'; // eslint-disable-line
import resources from '@reactory/server-core/resources'; // eslint-disable-line
import typeDefs from '@reactory/server-core/models/graphql/types'; // eslint-disable-line
import resolvers from '@reactory/server-core/models/graphql/resolvers'; // eslint-disable-line
import AuthConfig from '@reactory/server-core/authentication'; // eslint-disable-line
import workflow from '@reactory/server-core/workflow'; // eslint-disable-line
import pdf from '@reactory/server-core/pdf'; // eslint-disable-line
import { ExcelRouter } from '@reactory/server-core/excel'; // eslint-disable-line
import amq from '@reactory/server-core/amq';// eslint-disable-line
// import bots from './bot/server';
import startup from '@reactory/server-core/utils/startup'; // eslint-disable-line
import { getService } from '@reactory/server-core/services'; // eslint-disable-line
import { User } from '@reactory/server-core/models';
import logger from '@reactory/server-core/logging'; // eslint-disable-line
import ReactoryContextProvider from '@reactory/server-core/apollo/ReactoryContextProvider'; // eslint-disable-line
// @ts-ignore
import { Reactory } from '@reactory/server-core/types/reactory'; // eslint-disable-line
import resolveUrl from '@reactory/server-core/utils/url/resolve';

const hideText = (text: string = '') => {
  let asterisks = '';
  for (let ai: number = 0; ai < text.length - 2; ai += 1) {
    asterisks = `${asterisks}*`;
  }
  return `${text.substr(0, 1)}${asterisks}${text.substr(text.length - 1, 1)}}`;
};


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
  NODE_ENV = 'development',
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
  DEVELOPER_ID,
  SYSTEM_USER_ID = 'not-set',
  MAIL_REDIRECT_ADDRESS
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
  pass: ${MONGO_PASSWORD ? hideText(MONGO_PASSWORD) : '!!NOT-SET!!'}
  err: ${error.message}
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
  SECRET_SAUCE: '${hideText(SECRET_SAUCE)}',
  MAIL_REDIRECT_ADDRESS: ${MAIL_REDIRECT_ADDRESS}
  
  =========================================
         Microsoft OAuth2 Settings
  =========================================
  OAUTH_APP_ID: ${OAUTH_APP_ID}
  OAUTH_APP_PASSWORD: ${hideText(OAUTH_APP_PASSWORD)}
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

// For all routes we rune the cors middleware with options
reactoryExpress.use('*', cors(corsOptions));
reactoryExpress.use(reactoryClientAuthenticationMiddleware);
reactoryExpress.use(
  queryRoot,
  passport.authenticate(['jwt', 'anonymous'], { session: false }), bodyParser.urlencoded({ extended: true }),
  bodyParser.json({
    limit: MAX_FILE_UPLOAD,
  }),
);

try {
  const expressConfig: ApolloServerExpressConfig = {
    typeDefs,
    resolvers,
    context: ReactoryContextProvider,
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

reactoryExpress.set('trust proxy', NODE_ENV === 'development' ? 0 : 1);

// TODO: Werner Weber - investigate session and session management for auth.
// This session ONLY applies to authentication when authenticating via the
// passportjs authentication module.
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

const oldOptions = {
  secret: SECRET_SAUCE,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
};

reactoryExpress.use(session(oldOptions));
reactoryExpress.use(bodyParser.urlencoded({ extended: false }));
reactoryExpress.use(bodyParser.json({ limit: MAX_FILE_UPLOAD }));

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

if (SYSTEM_USER_ID === 'not-set') {
  logger.warn("SYSTEM_USER_ID env variable is not set - please configure in env variables");
}

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
  if (graphcompiled === true) {
    const graphql_api_root = resolveUrl(API_URI_ROOT, queryRoot);

    logger.info(`✅ Running a GraphQL API server at ${graphql_api_root}`);
    if (NODE_ENV === 'development' && DEVELOPER_ID) {
      User.find({ email: DEVELOPER_ID }).then((user_result) => {
        const auth_token = AuthConfig.jwtTokenForUser(user_result, { exp: moment().add(1, 'hour').unix() })
        logger.debug(`Developer id ${DEVELOPER_ID} access graphiql docs ${resolveUrl(API_URI_ROOT, `cdn/graphiql/index.html?auth_token=${auth_token}`)}`)
      });

    }
  }
  else logger.info(`🩺 GraphQL API not available - ${graphError}`);

  logger.info('✅ System Initialized/Ready, enabling app');
  global.REACTORY_SERVER_STARTUP = new Date();
  amq.raiseSystemEvent('server.startup.complete');
}).catch((startupError) => {
  logger.error('Server was unable to start successfully.', startupError);
  process.exit(0);
});
