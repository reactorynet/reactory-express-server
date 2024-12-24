import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import logger from '@reactory/server-core/logging';
/**
 * A middleware that will be used to set the context of the request
 * @param req 
 * @param res 
 * @param next 
 */
const ReactoryContextMiddleWare = (req: Express.Request, res: Express.Response, next: Function) => {
  ReactoryContextProvider(null,{}).then((context: Reactory.Server.IReactoryContext) => {
    //@ts-ignore
    req.context = context;
    //@ts-ignore
    context.request = req;
    //@ts-ignore
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
  nameSpace: "core",
  name: "ReactoryContextMiddleWare",
  version: "1.0.0",
  description: "Middleware for authenticating client applications",
  component: ReactoryContextMiddleWare,
  ordinal: -80,
  async: false,
  type: 'function'
}

export default ReactoryContextMiddleWareDefinition;