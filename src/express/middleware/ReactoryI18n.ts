import Express from 'express';
import i18n from '@reactory/server-core/express/i18n';
import i18nextHttp from 'i18next-http-middleware';
import logger from '@reactory/server-core/logging';
const ReactoryI18n = (app: Express.Application) => { 
  app.use(i18nextHttp.handle(i18n));
  logger.info('Configured i18n middleware');
};

const ReactoryI18nMiddlewareDefinition: Reactory.Server.ReactoryMiddlewareDefinition = {  
  name: 'ReactoryI18n',
  nameSpace: 'Reactory',
  version: '1.0.0',
  ordinal: 98,
  type: 'configuration',
  async: false,
  component: ReactoryI18n,
};

export default ReactoryI18nMiddlewareDefinition;
