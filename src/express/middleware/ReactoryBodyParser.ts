import Express from 'express';
import Http from 'http';
import bodyParser from 'body-parser';

const ReactoryBodyParser = (app: Express.Application, _: Http.Server): void => {
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json({ limit: process.env.MAX_FILE_UPLOAD }));
};

const ReactoryBodyParserDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {
  name: 'ReactoryBodyParser',
  nameSpace: 'Reactory',
  version: '1.0.0',
  ordinal: -90,
  type: 'configuration',
  async: false,
  component: ReactoryBodyParser,
};

export default ReactoryBodyParserDefinition;