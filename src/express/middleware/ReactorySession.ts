 import express from 'express';
 import session from 'express-session';
 import logger from '@reactory/server-core/logging';
 import { connection as mongooseConnection }  from '@reactory/server-core/models/mongoose';
 
 const ReactorySessionMiddleware = (app: express.Application) => {

  const getSessionStore = () => { 

    switch(process.env.REACTORY_SESSION_STORE) { 
      case 'file-store': {
        logger.debug('Using file store for session');
        const FileStore = require('session-file-store')(session);
        return new FileStore({
          path: process.env.REACTORY_SESSION_STORE_PATH || '/tmp/sessions',
          ttl: 60 * 5,
          retries: 0,
          reapInterval: 60 * 5,
        });
      }
      case 'mongo': {
        const MongoStore = require('connect-mongo')(session);
        logger.debug('Using mongo store for session');
        return new MongoStore({
          mongooseConnection,
          collection: 'reactory_sessions',
          ttl: 60 * 5,
          autoRemove: 'native',
          touchAfter: 24 * 3600,
        });
      }
      default: {
        logger.debug('Using memory store for session');
        return new session.MemoryStore();
      }
    }
  }

  // Session should ONLY be used for authentication when authenticating via the
  // passportjs authentication modules that requires session storage for the
  // authentication process.
  const sessionOptions: session.SessionOptions = {
    name: `${process.env.SERVER_ID}.sid`, 
    secret: process.env.SECRET_SAUCE,
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
    store: getSessionStore(),
    cookie: {
      domain: process.env.DOMAIN_NAME,
      maxAge: 60 * 5 * 1000,                
    },
  };

  app.use(session(sessionOptions));
}

const ReactorySessionMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {
  nameSpace: "core",
  name: "ReactorySessionMiddleware",
  version: "1.0.0",
  description: "Middleware for setting up session storage",
  component: ReactorySessionMiddleware,
  ordinal: -99,
  type: 'configuration',
  async: false
}

export default ReactorySessionMiddlewareDefinition;