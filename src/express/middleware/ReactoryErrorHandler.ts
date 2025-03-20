import logger from '@reactory/server-core/logging';
import Express from  'express';
import Reactory from '@reactory/reactory-core';

const ReactoryErrorHandler = (err: Error, req: Express.Request, res: Express.Response, next: Function) => { 
  const context = (req as Reactory.Server.ReactoryExpressRequest)?.context;

  logger.error(`Express Error Handler`, {
    err,
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
    contextId: context?.id,
    userId: `${context?.user?.id}`
  });

  if (res.headersSent === true) {
    return next(err)
  }

  let message = "An error occured while processing your request. Please try again later." 

  if (context?.i18n) {
    message = context.i18n.t('errors.500');
  }
  res.status(500);

  if (req.accepts('json')) {
    res.json({ error: {
      contextId: context?.id || 'unknown',
      message,
      status: 500,
    } });
  } else {
    res.render('errors/500', { message })
  }
};


const ReactoryErrorHandlerMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = { 
  nameSpace: "core",
  name: "ReactoryErrorHandler",
  version: "1.0.0",
  description: "Middleware for handling errors in the application",
  component: ReactoryErrorHandler as Reactory.Server.ExpressErrorHandlerMiddlewareFunction,
  ordinal: 99,
  async: false,
  type: 'function'
};


export default ReactoryErrorHandlerMiddlewareDefinition;