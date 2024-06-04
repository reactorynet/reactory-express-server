import coreResolvers from './resolvers';
import coreTypes from './graph/types';
import directives from './graph/directives';
import coreWorkflows from './workflow';
import coreForms from './forms';
import models from './models';
import coreServices from './services';
import translations from './data/translations';
import Reactory from '@reactory/reactory-core';

const ReactoryCoreModule: Reactory.Server.IReactoryModule = {
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
  cli: [],
  description: 'Reactory Core Module',
  grpc: null,
  passportProviders: [],
  pdfs: [],
};

export default ReactoryCoreModule