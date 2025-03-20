import express from 'express';
import http from 'http';
import logger from '@reactory/server-core/logging';
import ReactoryModules from '@reactory/server-core/modules';
import ReactoryBodyParser from './ReactoryBodyParser';
import ReactoryCors from './ReactoryCors';
import ReactoryI18n from './ReactoryI18n';
import ReactoryClient from './ReactoryClient';
import ReactoryContext from './ReactoryContext';
import ReactoryErrorHandler from './ReactoryErrorHandler';
import ReactoryGraph from './ReactoryGraph';
import ReactoryMorgan from './ReactoryMorgan';
import ReactorySession from './ReactorySession';
import ReactorySwagger  from './ReactorySwagger';
const DEFAULT_MIDDLEWARE = [
  ReactoryCors,
  ReactoryI18n,
  ReactoryClient,
  ReactoryContext,
  ReactoryErrorHandler,
  ReactoryGraph,
  ReactoryMorgan,
  ReactorySession,
  ReactoryBodyParser,
  ReactorySwagger
];

const configureMiddleware = (app: express.Application, httpServer: http.Server) => {
  

  let middlewares: Reactory.Server.ReactoryMiddlewareDefinition[] = [...DEFAULT_MIDDLEWARE];
  ReactoryModules.enabled.forEach(module => { 
    if(module.middleware && module.middleware.length > 0)
    {
      module.middleware.forEach(middleware => {
        middlewares.push(middleware);
      });
    }
  });

  middlewares.sort((a, b) => a.ordinal - b.ordinal);
  
  middlewares.forEach(middleware => {     
    if (middleware.component && middleware.type === 'configuration') {
      logger.info(`Configuring middleware: ${middleware.nameSpace}.${middleware.name}@${middleware.version}`);
      if (!middleware.async) {
        (middleware.component as Reactory.Server.ExpressMiddlewareConfigurationFunction)(app, httpServer);
      }
      else {
        (middleware.component as Reactory.Server.ExpressMiddlewareConfigurationFunctionAsync)(app, httpServer)
          .then(() => {
            logger.info(`Configured middleware: ${middleware.nameSpace}.${middleware.name}@${middleware.version}`);
          })
          .catch((err: Error) => {  
            logger.error(`Error configuring middleware: ${middleware.nameSpace}.${middleware.name}@${middleware.version}`, { err });
          });
      }
    }

    if (middleware.component && middleware.type === 'function') {
      logger.info(`Adding middleware: ${middleware.nameSpace}.${middleware.name}@${middleware.version}`);
      try {
        app.use(middleware.component as Reactory.Server.ExpressMiddlewareFunction);
      } catch (err) {
        logger.error(`Error adding middleware: ${middleware.nameSpace}.${middleware.name}@${middleware.version}`, { err });
      }
    }
  });
}

export default configureMiddleware;