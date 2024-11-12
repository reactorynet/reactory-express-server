import express from 'express';
import http from 'http';
import cors from 'cors';
import passport from 'passport';
import bodyParser from 'body-parser';
import i18n from '@reactory/server-core/express/i18n';
import i18nextHttp from 'i18next-http-middleware';
import corsOptions from '@reactory/server-core/express/cors';
import ReactoryClientMiddleware from './ReactoryClient';
import ReactoryContextMiddleWare from './ReactoryContext';
import ReactorySessionMiddleware from './ReactorySession';
import ReactoryGraphMiddleware from './ReactoryGraph';
import ReactoryErrorHandler from './ReactoryErrorHandler';

import configureMorgan from './ReactoryMorgan';
import {
  SwaggerUi,
  swaggerSpec,
} from '@reactory/server-core/express/swagger/swagger';

const {
  MORGAN_MIDDLEWARE_ENABLED = 'false',
} = process.env;

const configureMiddleware = (app: express.Application, httpServer: http.Server) => {
  app.use('*',cors(corsOptions));
  // configure the session middleware first.
  ReactorySessionMiddleware(app);
  // This will set the context of the request whether
  // the client is authenticated or not.
  // @ts-ignore
  app.use(ReactoryContextMiddleWare);
  // load the client middleware next.
  // This will authenticate the client and set the client
  // object on context for the request.
  app.use(ReactoryClientMiddleware);

  
  ReactoryGraphMiddleware(app, httpServer)
  // load the morgan middleware if enabled.
  if (MORGAN_MIDDLEWARE_ENABLED === 'true')
    configureMorgan(app);
  
  app.use(i18nextHttp.handle(i18n));
  
  app.set('trust proxy', process.env.NODE_ENV === 'development' ? 0 : 1);  
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({ limit: process.env.MAX_FILE_UPLOAD }));
  
  //@ts-ignore
  app.use(ReactoryErrorHandler);

  app.use('/swagger', SwaggerUi.serve, SwaggerUi.setup(swaggerSpec));


}

export default configureMiddleware;