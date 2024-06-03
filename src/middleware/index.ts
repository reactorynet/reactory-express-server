import express from 'express';
import {configureApp as configureReactoryClient } from './ReactoryClient';
import configureMorgan from './Morgan';

const {
  MORGAN_MIDDLEWARE_ENABLED = 'false',
} = process.env;

const configureMiddleware = (app: express.Application) => {
  configureReactoryClient(app);

  if (MORGAN_MIDDLEWARE_ENABLED === 'true')
    configureMorgan(app);

}

export default configureMiddleware;