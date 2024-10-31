import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import logger from '@reactory/server-core/logging';
/**
 * A middleware that will be used to set the context of the request
 * @param req 
 * @param res 
 * @param next 
 */
const ReactoryContextMiddleWare = (req: Express.Request, res: Response, next: Function) => {
  ReactoryContextProvider(null,{}).then((context: Reactory.Server.IReactoryContext) => {
    //@ts-ignore
    req.context = context;
    context.request = req;
    context.response = res;
    context.debug(`ReactoryContextMiddleWare:: created for route ${req.url}`)
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

export default ReactoryContextMiddleWare;