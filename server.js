import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { buildSchema } from 'graphql';
import corsOptions from './config/cors';
import typeDefs from './models/graphql/types';
import resolvers from './models/graphql/resolvers';
import AuthConfig from './authentication'
import { testConnection } from './database/legacy';
const query_root = '/api'
const graphiql = '/q'


let schema = makeExecutableSchema({typeDefs, resolvers})
const app = express();
app.use("*", cors(corsOptions));
testConnection('plc');
AuthConfig.Configure(app);
app.use(query_root, 
    bodyParser.urlencoded({extended: true}), 
    bodyParser.json(),
    graphqlExpress({ schema, debug: true }));

app.use(graphiql, graphiqlExpress({endpointURL: query_root}));
app.listen(4000);

console.log(`Running a GraphQL API server at localhost:4000${query_root}`);