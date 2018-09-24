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


dotenv.config();

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
const app = express();
app.use('*', cors(corsOptions));
app.use(clientAuth);
testConnection('plc');
mongoose.connect(MONGOOSE);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '10mb' }));
startup().then((startupResult) => {
  console.log('System Initialized/Ready, enabling app', startupResult);
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
  console.log(`Bots server using ${bots.name}`);
  console.log(`Running a GraphQL API server at ${API_URI_ROOT}${queryRoot}`);
}).catch((error) => {
  console.error('System Initialized/Ready - failed, exiting app', error);
  process.exit();
});
