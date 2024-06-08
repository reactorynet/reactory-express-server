import express from 'express';
import ReactoryClientMiddleware from './ReactoryClient';
import ReactoryContextMiddleWare from './ReactoryContext';
import ReactorySessionMiddleware from './ReactorySession';

import configureMorgan from './Morgan';

const {
  MORGAN_MIDDLEWARE_ENABLED = 'false',
} = process.env;

const configureMiddleware = (app: express.Application) => {
  // configure the session middleware first.
  ReactorySessionMiddleware(app);
  // This will set the context of the request whether
  // the client is authenticated or not.
  app.use(ReactoryContextMiddleWare);
  // load the client middleware next.
  // This will authenticate the client and set the client
  // object on context for the request.
  app.use(ReactoryClientMiddleware);
  // load the morgan middleware if enabled.
  if (MORGAN_MIDDLEWARE_ENABLED === 'true')
    configureMorgan(app);
}

export default configureMiddleware;