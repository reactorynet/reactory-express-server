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
  // Must sort before ReactoryGraph (-60): middleware is ordered ascending, and
  // at 98 (or 0) this ran after every request had already been handled, so
  // request language detection never applied to /graph.
  ordinal: -85,
  type: 'configuration',
  async: false,
  component: ReactoryI18n,
};

export default ReactoryI18nMiddlewareDefinition;
