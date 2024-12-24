import Express from 'express';
import Http from 'http';
import {
  SwaggerUi,
  swaggerSpec,
} from '@reactory/server-core/express/swagger/swagger';

const ReactorySwagger = (app: Express.Application, _: Http.Server) => { 
  app.use('/swagger', SwaggerUi.serve, SwaggerUi.setup(swaggerSpec));
};

const ReactorySwaggerDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {  
  name: 'ReactorySwagger',
  nameSpace: 'Reactory',
  version: '1.0.0',
  ordinal: 100,
  type: 'configuration',
  async: false,
  component: ReactorySwagger,
};

export default ReactorySwaggerDefinition;