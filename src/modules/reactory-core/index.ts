import coreClis from './cli';
import coreResolvers from './resolvers';
import coreTypes from './graph/types';
import directives from './graph/directives';
import coreWorkflows from './workflows';
import coreForms from './forms';
import models from './models';
import coreServices from './services';
import routes from './routes';
import translations from './data/translations';
import Reactory from '@reactory/reactory-core';
import middleware from './middleware';

const ReactoryCoreModule: Reactory.Server.IReactoryModule = {
  id: 'reactory-core',
  nameSpace: 'core',
  version: '1.0.0',
  name: 'ReactoryServer',
  dependencies: [],
  priority: 0,
  graphDefinitions: {
    Resolvers: coreResolvers,
    Types: [...coreTypes],
    Directives: directives    
  },
  //@ts-ignore
  workflows: [...coreWorkflows],
  forms: [ ...coreForms ],
  services: [ ...coreServices ],
  translations: translations,
  models: [ ...models ],
  clientPlugins: [],
  serverPlugins: [],
  //@ts-ignore
  cli: [...coreClis],
  description: 'Reactory Core Module. The core module for the Reactory Server, providing essential services, models, and workflows.',
  grpc: null,
  passportProviders: [],
  pdfs: [],
  middleware,
  routes,
};

export default ReactoryCoreModule