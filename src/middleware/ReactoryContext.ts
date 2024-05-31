import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';

/**
 * A middleware that will be used to set the context of the request
 * @param req 
 * @param res 
 * @param next 
 */
const ReactoryContextMiddleWare = (req: Express.Request, res: Express.Response, next: Function) => {
  ReactoryContextProvider(req.session, {}).then((context: Reactory.Server.IReactoryContext) => {
    //@ts-ignore
    req.context = context;
    next();
  }).catch((err) => {
    // @ts-ignore
    res.status(500)
      .send({ 
        error: 'context-error', 
        description: 'Failed to set the context of the request' 
      });
  });
};

export default ReactoryContextMiddleWare;