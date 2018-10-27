import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import passport from 'passport';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import mongoose from 'mongoose';
import corsOptions from './config/cors';
import clientAuth from './middleware/clientauth';
import userAccountRouter from './useraccount';
import reactory from './reactory';
import typeDefs from './models/graphql/types';
import resolvers from './models/graphql/resolvers';
import AuthConfig from './authentication';
import { testConnection } from './database/legacy';
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
  MONGOOSE,
  API_PORT,
  API_URI_ROOT,
} = process.env;

const queryRoot = '/api';
const graphiql = '/q';
const resources = '/cdn';
const publicFolder = path.join(__dirname, 'public');

const schema = makeExecutableSchema({ typeDefs, resolvers });
logger.info('Graph Schema Compiled, starting express');
const app = express();
app.use('*', cors(corsOptions));
app.use(clientAuth);

try {
  testConnection('plc');
} catch (err) {
  logger.warn('Could not connect to MySQL', err);
}

mongoose.connect(MONGOOSE);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '10mb' }));

try {
  const startupResult = startup();
  logger.info('System Initialized/Ready, enabling app', startupResult);
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
  app.use(resources, express.static(APP_DATA_ROOT || publicFolder));
  app.listen(API_PORT);
  logger.info(`Bots server using ${bots.name}`);
  logger.info(`Running a GraphQL API server at ${API_URI_ROOT}${queryRoot}`);
  // process.send('ready');
} catch (startError) {
  logger.error('System Initialized/Ready - failed, exiting app', startError);
  process.exit();
}
