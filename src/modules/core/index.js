import coreResolvers from './resolvers';
import coreTypes from './graph/types';
import coreWorkflows from './workflow';
import coreForms from './forms';
import coreServices from './services';

export default {
  nameSpace: 'core',
  version: '1.0.0',
  name: 'ReactoryServer',
  dependencies: [],
  priority: 0,
  graphDefinitions: {
    Resolvers: coreResolvers,
    Types: [...coreTypes],
  },
  workflows: [...coreWorkflows],
  forms: [ ...coreForms ],
  services: [ ...coreServices ],
};
