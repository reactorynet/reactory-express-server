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
import { Reactory } from '@reactory/server-core/types/reactory';
// import { makeExecutableSchema } from 'graphql-tools';
import mongoose from 'mongoose';
import flash from 'connect-flash';
// import { graphqlUploadExpress } from 'graphql-upload';

import corsOptions from './config/cors';
import reactoryClientAuthenticationMiddleware from './middleware/ReactoryClient';
import userAccountRouter from './useraccount';
import reactory from './reactory';
import froala from './froala';
import charts from './charts';
import resources from './resources';
import services from './services';
import typeDefs from './models/graphql/types';
import resolvers from './models/graphql/resolvers';
import AuthConfig from './authentication';
import workflow from './workflow';
import pdf from './pdf';
import { ExcelRouter } from './excel';
import amq from './amq';
// import bots from './bot/server';
import startup from './utils/startup';
import logger from './logging';
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

const {
  APP_DATA_ROOT,
  APP_SYSTEM_FONTS,
  MONGOOSE,
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
  SECRET_SAUCE
} = process.env;


let asciilogo = `Reactory Server version : ${packageJson.version} - start ${moment().format('YYYY-MM-dd HH:mm:ss')}`;

if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`)) {
  const logo = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`, { encoding: 'utf-8' });
  asciilogo = `${asciilogo}\n\n${logo}`;
}

let asterisks = '';
for(let si:number = 0;si < SECRET_SAUCE.length - 2; si += 1){ asterisks = `${asterisks}*` };

const ENV_STRING_DEBUG = `
Environment Settings: 
  APP_DATA_ROOT: ${APP_DATA_ROOT}
  APP_SYSTEM_FONTS: ${APP_SYSTEM_FONTS}
  API_PORT: ${API_PORT}
  API_URI_ROOT: ${API_URI_ROOT}
  CDN_ROOT: ${CDN_ROOT}
  DOMAIN_NAME: ${DOMAIN_NAME}
  MODE: ${MODE}
  MONGOOSE: ${MONGOOSE}
  SECRET_SAUCE: '${SECRET_SAUCE.substr(0,1)}${asterisks}${SECRET_SAUCE.substr(SECRET_SAUCE.length -1,1)}',
  
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
const graphiql = '/q';
const resourcesPath = '/cdn';
const publicFolder = path.join(__dirname, 'public');

mongoose.connect(MONGOOSE, { useNewUrlParser: true });

let apolloServer: ApolloServer = null;
let graphcompiled: boolean = false;
let graphError: String = '';

const reactoryExpress: Application = express();
/*
services.forEach((service: Reactory.IReactoryServiceDefinition) => {
  //logger.debug(`Service ${service.id}`)
});
*/

reactoryExpress.use('*', cors(corsOptions));
reactoryExpress.use(reactoryClientAuthenticationMiddleware);
reactoryExpress.use(queryRoot,
  //authentication
  passport.authenticate(['jwt', 'anonymous'], { session: false }), bodyParser.urlencoded({ extended: true }),
  //bodyparser options
  bodyParser.json({ limit: '10mb' }));

try {
  //app.use(queryRoot, graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));
  let expressConfig: ApolloServerExpressConfig = {
    typeDefs,
    resolvers,
    uploads: {
      maxFileSize: 10000000,
      maxFiles: 10,
    },
  };
  apolloServer = new ApolloServer(expressConfig);
  //schema = makeExecutableSchema({ typeDefs, resolvers });
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

//TODO: Werner Weber - investigate session and session management for auth.
const sessionOptions: session.SessionOptions = {
  name: "reactory.sid",
  secret: SECRET_SAUCE,
  resave: false,
  proxy: NODE_ENV === 'development' ? false : true,
  cookie: {
    domain: DOMAIN_NAME,
    maxAge: 60 * 5 * 1000,
    httpOnly: NODE_ENV === 'development' ? true : false,
    sameSite: 'lax',
    secure: NODE_ENV === 'development' ? false : true,
  },
  saveUninitialized: false,
  unset: 'destroy',
};

const oldOptions = {
  secret: SECRET_SAUCE,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
}

reactoryExpress.use(session(oldOptions));



reactoryExpress.use(bodyParser.urlencoded({ extended: false }));
reactoryExpress.use(bodyParser.json({ limit: '10mb' }));

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

startup().then((startResult) => {
  
  AuthConfig.Configure(reactoryExpress);
  reactoryExpress.use(userAccountRouter);
  reactoryExpress.use('/reactory', reactory);
  reactoryExpress.use('/froala', froala);
  reactoryExpress.use('/deliveries', froala);
  reactoryExpress.use('/workflow', workflow);
  reactoryExpress.use('/resources', resources);
  reactoryExpress.use('/pdf', passport.authenticate(
    ['jwt'], 
    { session: false }), 
    bodyParser.urlencoded({ extended: true }
    ), pdf);
  reactoryExpress.use('/excel', ExcelRouter);
  reactoryExpress.use('/charts', charts);
  reactoryExpress.use('/amq', amq.router);
  reactoryExpress.use(resourcesPath,
    passport.authenticate(
      ['jwt', 'anonymous'],
      { session: false }),
    bodyParser.urlencoded({ extended: true }
    ),
    express.static(APP_DATA_ROOT || publicFolder));
  reactoryExpress.listen(API_PORT);
  reactoryExpress.use(flash());

  logger.info(asciilogo);
  if (graphcompiled === true) logger.info(`✅ Running a GraphQL API server at ${API_URI_ROOT}${queryRoot}`);
  else logger.info(`🩺 GraphQL API not available - ${graphError}`);
  
  logger.info(`✅ System Initialized/Ready, enabling app`);
  global.REACTORY_SERVER_STARTUP = new Date();
  amq.raiseSystemEvent('server.startup.complete');

});
