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
  '/auth/'
];

const {
  MORGAN_MIDDLEWARE_FILTERS = '',
} = process.env;

const additionalFilters = MORGAN_MIDDLEWARE_FILTERS.split(',');
const allFilters = filters.concat(additionalFilters);
const regexFilters = allFilters.map(pattern => new RegExp(pattern));

const morganFormat = ':method :url :status :response-time ms - :res[content-length]';

const morganMiddleware = morgan(morganFormat, {
  stream: {
    write: (message: string) => {
      // Extract the URL from the log message
      const urlMatch = message.match(/"(GET|POST|PUT|DELETE|PATCH|OPTIONS) (.*?) HTTP/);
      if (urlMatch && urlMatch[2]) {
        const url = urlMatch[2];
        // Check if the URL matches any of the regex filters
        if (regexFilters.some((regex: RegExp) => regex.test(url))) {
          logger.info(message.trim());
        }
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
  app.use(responseBodyCaptureMiddleware);
  app.use(morganMiddleware);
}

export default configureApp;
