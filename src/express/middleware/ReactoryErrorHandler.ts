import logger from '@reactory/server-core/logging';

const ReactoryErrorHandler = (err: Error, req: Express.Request, res: Express.Response, next: Function) => { 
  logger.error(`Express Error Handler`, { err: req });
  // @ts-ignore
  if (res.headersSent === true) {
    return next(err)
  }
  // @ts-ignore
  res.status(500);
  // @ts-ignore
  res.render('error', { error: err })
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