import morgan from 'morgan';
import express from 'express';
import http from 'http';
import logger from '@reactory/server-core/logging';

const filters = [
  '/cdn/content/',
  '/cdn/plugins/',
  '/cdn/profiles/',
  '/cdn/organization/',
  '/cdn/themes/',
  '/cdn/ui/',
  '/favicon.ico',
  '/auth/',
  'google'
];

const {
  MORGAN_MIDDLEWARE_FILTERS = '',
} = process.env;

const additionalFilters = MORGAN_MIDDLEWARE_FILTERS.split(',');
const allFilters = filters.concat(additionalFilters);
const regexFilters = allFilters.map(pattern => new RegExp(pattern));

const morganFormat = ':method :url :status :response-time ms - :res[content-length]';

const morganMiddleware = morgan('combined', {  
  stream: {
    write: (message: string) => {
      // include only messages that match the filters
      const matched = regexFilters.some(filter => filter.test(message));
      if(matched === true) { 
        logger.debug(message);
      }
    }
  }
});

const responseBodyCaptureMiddleware = (_req: any, res: { send: (body: any) => any; }, next: () => void) => {
  const originalSend = res.send;
  res.send = function (body: any) {
    (res as any).body = body;
    return originalSend.apply(this, arguments);
  };
  next();
};

const configureApp = (app: express.Application, httpServer: http.Server) => {
  logger.info('Configuring Morgan Middleware'); 
  const {
    MORGAN_MIDDLEWARE_ENABLED = 'false',
  } = process.env;

  if(MORGAN_MIDDLEWARE_ENABLED === 'false') {
    logger.info('Morgan Middleware is disabled');
    return;
  }
  
  app.use(responseBodyCaptureMiddleware);
  app.use(morganMiddleware);
}

const ReactoryMorganMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = { 
  nameSpace: "core",
  name: "ReactoryMorganMiddleware",
  version: "1.0.0",
  description: "Middleware for setting up the morgan logger",
  component: configureApp,
  ordinal: -50,
  type: 'configuration',
  async: false
}

export default ReactoryMorganMiddlewareDefinition;
