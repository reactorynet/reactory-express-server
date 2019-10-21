import fs from 'fs';
import moment from 'moment';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import passport from 'passport';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import mongoose from 'mongoose';
import session from 'express-session';
import flash from 'connect-flash';
import corsOptions from './config/cors';
import clientAuth from './middleware/clientauth';
import userAccountRouter from './useraccount';
import reactory from './reactory';
import froala from './froala';
import charts from './charts';
import resources from './resources';
import typeDefs from './models/graphql/types';
import resolvers from './models/graphql/resolvers';
import AuthConfig from './authentication';
import workflow from './workflow';
import pdf from './pdf';
import amq from './amq';
// import bots from './bot/server';
import startup from './utils/startup';
import logger from './logging';

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
  const logo = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/asciilogo.txt`, { enocding: 'utf-8' });
  asciilogo = `${asciilogo}\n\n${logo}`;
}


const ENV_STRING_DEBUG = `
${asciilogo}
Environment Settings: 
  API_DATA_ROOT: ${APP_DATA_ROOT}
  APP_SYSTEM_FONTS: ${APP_SYSTEM_FONTS}
  MONGOOSE: ${MONGOOSE}
  API_PORT: ${API_PORT}
  API_URI_ROOT: ${API_URI_ROOT}
  CDN_ROOT: ${CDN_ROOT}
  MODE: ${MODE}
  =========================================
         Microsoft OAuth Settings
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
let schema = null;

try {
  schema = makeExecutableSchema({ typeDefs, resolvers });
  logger.info('Graph Schema Compiled, starting express');
} catch (schemaCompilationError) {
  if (fs.existsSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`)) {
    const error = fs.readFileSync(`${APP_DATA_ROOT}/themes/reactory/graphql-error.txt`, { enocding: 'utf-8' });    
    logger.error(`\n\n${error}`);
  }    
  logger.error(`Error compiling the graphql schema ${schemaCompilationError.message}`);
}

const app = express();
app.use('*', cors(corsOptions));
app.use(clientAuth);

//TODO: Werner Weber - investigate session and session management for auth.
app.use(session({
  secret: SECRET_SAUCE,
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
}));


mongoose.connect(MONGOOSE, { useNewUrlParser: true });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '10mb' }));

// try {
startup().then((startResult) => {
  logger.debug('Startup Generator Done.');
  amq.raiseSystemEvent('server.startup.begin');
  AuthConfig.Configure(app);
  app.use(
    queryRoot,
    passport.authenticate('jwt', { session: false }), bodyParser.urlencoded({ extended: true }),
    bodyParser.json({ limit: '10mb' }),
    graphqlExpress({ schema, debug: true }),
  );

  app.use(graphiql, graphiqlExpress({ endpointURL: queryRoot }));
  app.use(userAccountRouter);
  app.use('/reactory', reactory);
  app.use('/froala', froala);
  app.use('/deliveries', froala);
  app.use('/workflow', workflow);
  app.use('/resources', resources);
  app.use('/pdf', pdf);
  app.use('/charts', charts);
  app.use('/amq', amq.router);
  app.use(resourcesPath, express.static(APP_DATA_ROOT || publicFolder));
  app.listen(API_PORT);
  app.use(flash());
  // logger.info(`Bots server using ${bots.name}`);
  logger.info(`Running a GraphQL API server at ${API_URI_ROOT}${queryRoot}`);
  logger.info('System Initialized/Ready, enabling app');
  amq.raiseSystemEvent('server.startup.complete');

});
