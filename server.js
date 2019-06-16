import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import passport from 'passport';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import mongoose from 'mongoose';
import session from 'express-session';
import corsOptions from './config/cors';
import clientAuth from './middleware/clientauth';
import userAccountRouter from './useraccount';
import reactory from './reactory';
import froala from './froala';
import typeDefs from './models/graphql/types';
import resolvers from './models/graphql/resolvers';
import AuthConfig from './authentication';
import workflow from './workflow';
import pdf from './pdf';
import bots from './bot/server';
import startup from './utils/startup';
import logger from './logging';

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
} = process.env;

const ENV_STRING_DEBUG = `
Environment Settings: 
  API_DATA_ROOT: ${APP_DATA_ROOT}
  APP_SYSTEM_FONTS: ${APP_SYSTEM_FONTS}
  MONGOOSE: ${MONGOOSE}
  API_PORT: ${API_PORT}
  API_URI_ROOT: ${API_URI_ROOT}
  CDN_ROOT: ${CDN_ROOT}
  MODE: ${MODE}
`;

logger.info(ENV_STRING_DEBUG);

const queryRoot = '/api';
const graphiql = '/q';
const resources = '/cdn';
const publicFolder = path.join(__dirname, 'public');
let schema = null;

try {
  schema = makeExecutableSchema({ typeDefs, resolvers });
  logger.info('Graph Schema Compiled, starting express');
} catch (schemaCompilationError) {
  logger.error(`Error compiling the graphql schema ${schemaCompilationError.message}`);
}

const app = express();
app.use('*', cors(corsOptions));
app.use(clientAuth);

app.use(session({
  secret: 'your_secret_value_here',
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
}));

/*
try {
  testConnection('plc');
} catch (err) {
  logger.warn('Could not connect to MySQL', err);
}
*/

mongoose.connect(MONGOOSE);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '10mb' }));

// try {
startup().then((startResult) => {
  logger.debug('Startup Generator Done.');
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
  app.use('/workflow', workflow);
  app.use('/pdf', pdf);
  app.use(resources, express.static(APP_DATA_ROOT || publicFolder));
  app.listen(API_PORT);
  // logger.info(`Bots server using ${bots.name}`);
  logger.info(`Running a GraphQL API server at ${API_URI_ROOT}${queryRoot}`);
  logger.info('System Initialized/Ready, enabling app');
  // process.send('ready');
});// .catch(startErr => logger.error(startErr));
// } catch (startError) {
// logger.error('System Initialized/Ready - failed, exiting app', startError);
// process.exit();
// }
