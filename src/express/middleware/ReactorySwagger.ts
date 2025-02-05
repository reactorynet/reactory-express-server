import Express from 'express';
import Http from 'http';
import {
  SwaggerUi,
  swaggerSpec,
} from '@reactory/server-core/express/swagger/swagger';
import log from '@reactory/server-core/logging';

const ReactorySwagger = (app: Express.Application, _: Http.Server) => { 
  try {
    app.use('/swagger', SwaggerUi.serve, SwaggerUi.setup(swaggerSpec));
  } catch (err) {
    log.error(err);
  }
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