import morgan from 'morgan';
import express from 'express';
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

const configureApp = (app: express.Application) => {
  logger.info('Configuring Morgan Middleware'); 
  app.use(responseBodyCaptureMiddleware);
  app.use(morganMiddleware);
}

export default configureApp;
