import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import passport from 'passport';
import * as http from 'http';
import * as WebSocket from 'ws';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { buildSchema } from 'graphql';
import mongoose from 'mongoose';
import corsOptions from './config/cors';
import typeDefs from './models/graphql/types';
import resolvers from './models/graphql/resolvers';
import AuthConfig from './authentication';
import { testConnection } from './database/legacy';
import bots from './bot/server';
import startup from './utils/startup';

const queryRoot = '/api';
const graphiql = '/q';

const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();
app.use('*', cors(corsOptions));
testConnection('plc');
mongoose.connect('mongodb://localhost:27017/reactory');


startup().then((startupResult) => {
  console.log('System Initialized/Ready, enabling app', startupResult);
  AuthConfig.Configure(app);
  app.use(
    queryRoot,
    passport.authenticate('jwt', { session: false }), bodyParser.urlencoded({ extended: true }),
    bodyParser.json(),
    graphqlExpress({ schema, debug: true }),
  );

  app.use(graphiql, graphiqlExpress({ endpointURL: queryRoot }));
  app.listen(4000);
  
  console.log(`Bots server using ${bots.name}`);
  console.log(`Running a GraphQL API server at localhost:4000${queryRoot}`);
}).catch((error) => {
  console.error('System Initialized/Ready - failed, exiting app', error);
  process.exit();
});
