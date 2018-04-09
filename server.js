import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import * as http from 'http';
import * as WebSocket from 'ws';
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { buildSchema } from 'graphql';
import restify from 'restify';
import corsOptions from './config/cors';
import typeDefs from './models/graphql/types';
import resolvers from './models/graphql/resolvers';
import AuthConfig from './authentication';
import { testConnection } from './database/legacy';


const query_root = '/api';
const graphiql = '/q';
const builder = require('botbuilder');


const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();
app.use('*', cors(corsOptions));
testConnection('plc');
AuthConfig.Configure(app);
app.use(
  query_root,
  bodyParser.urlencoded({ extended: true }),
  bodyParser.json(),
  graphqlExpress({ schema, debug: true }),
);

// initialize simple server
const server = http.createServer(app);
// initialize the WebSocket server
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  // connection is up, let's add a simple simple event
  ws.on('message', (message) => {
    // log the received message and send it back to the client
    console.log('received: %s', message);
    ws.send(`Hello, you sent -> ${message}`);
  });

  // send immediatly a feedback to the incoming connection
  ws.send('Hi there, I am a WebSocket server');
});


app.use(graphiql, graphiqlExpress({ endpointURL: query_root }));
app.listen(4000);

server.listen(4001, () => {
  console.log('Chat server running on 4001');
});

console.log(`Running a GraphQL API server at localhost:4000${query_root}`);


const restServer = restify.createServer();
restServer.listen(process.env.REST_PORT || 3978, () => {
  console.log('%s listening to %s', restServer.name, restServer.url);
});

// Create chat connector for communicating with the Bot Framework Service
const botStorage = new builder.MemoryBotStorage();

const botConnector = new builder.ChatConnector({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
});

// Listen for messages from users
restServer.post('/chat/sparky', botConnector.listen());

const bot = new builder.UniversalBot(botConnector, [
  (session) => {    
    session.beginDialog('ensureProfile', session.userData.profile);
  },
  (session, results) => {
    session.userData.profile = results.response; // eslint-disable-line 
    session.send(`Welcome to WooSparks ${session.userData.profile.name}, let's setup your company `);
  },
]).set('storage', botStorage);

bot.dialog('welcome', [

]);

bot.dialog('ensureProfile', [
  (session, args, next) => {
    session.dialogData.profile = args || {}; // eslint-disable-line 
    if (!session.dialogData.profile.name) {
      builder.Prompts.text(session, "Hallo, what's your name?");
    } else {
      next(); // Skip if we already have this info.
    }
  },
  (session, results, next) => {
    if (results.response) {
      // Save user's name if we asked for it.
      session.dialogData.profile.name = results.response; // eslint-disable-line 
    }
    if (!session.dialogData.profile.company) {
      builder.Prompts.text(session, 'What company do you work for?');
    } else {
      next(); // Skip if we already have this info.
    }
  },
  (session, results) => {
    if (results.response) {
      // Save company name if we asked for it.
      session.dialogData.profile.company = results.response; // eslint-disable-line 
    }
    session.endDialogWithResult({ response: session.dialogData.profile });
  },
]);

console.log('Bot started', bot);
