import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import logger from '@reactory/server-core/logging';
import { languageFromHeaders, resolveLanguage } from '@reactory/server-core/express/i18n/language';
import Express from 'express';
import Reactory from '@reactorynet/reactory-core';

/**
 * A middleware that will be used to set the context of the request
 * @param req
 * @param res
 * @param next
 */
const ReactoryContextMiddleWare = (req: Express.Request, res: Express.Response, next: Function) => {
  // The context is built before the request reaches the language-detecting
  // middleware, so the requested language is read here and handed to the
  // provider. This is what gives each request its own translation instance
  // instead of sharing the process-wide one.
  const lang = resolveLanguage(languageFromHeaders(req.headers as any));

  ReactoryContextProvider(null, { lang }).then((context: Reactory.Server.IReactoryContext) => {
    // @ts-ignore
    req.context = context;
    // @ts-ignore
    context.request = req;
    // @ts-ignore
    context.response = res;
    next();
  }).catch((err) => {
    logger.error(`Failed to set the context of the request: ${err.message}`);
    // @ts-ignore
    res.status(500)
      .send({
        error: 'context-error',
        description: 'Failed to set the context of the request'
      });
  });
};

const ReactoryContextMiddleWareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {
  nameSpace: 'core',
  name: 'ReactoryContextMiddleWare',
  version: '1.0.0',
  description: 'Middleware for authenticating client applications',
  component: ReactoryContextMiddleWare,
  ordinal: -80,
  async: false,
  type: 'function'
};

export default ReactoryContextMiddleWareDefinition;
