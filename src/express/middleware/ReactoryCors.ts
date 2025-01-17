import Express from 'express';
import CorsOptions from '@reactory/server-core/express/cors';
import cors from 'cors';

const ReactoryCors = (app: Express.Application) => { 
  app.use('*',cors(CorsOptions));
  app.set('trust proxy', process.env.TRUST_PROXY === 'false' ? 0 : 1);
};

const ReactoryCorsMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {
  name: 'ReactoryCors',
  nameSpace: 'Reactory',
  version: '1.0.0',
  ordinal: -100,
  type: 'configuration',
  async: false,
  component: ReactoryCors,
};

export default ReactoryCorsMiddlewareDefinition;