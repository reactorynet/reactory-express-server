import express from 'express';
import ReactoryClientMiddleware from './ReactoryClient';
import ReactoryContextMiddleWare from './ReactoryContext';
import configureMorgan from './Morgan';

const {
  MORGAN_MIDDLEWARE_ENABLED = 'false',
} = process.env;

const configureMiddleware = (app: express.Application) => {
  app.use(ReactoryClientMiddleware);
  app.use(ReactoryContextMiddleWare);

  if (MORGAN_MIDDLEWARE_ENABLED === 'true')
    configureMorgan(app);
}

export default configureMiddleware;