import lasecResolvers from './resolvers';
import lasecTypes from './graph/types';
import lasecWorkflows from './workflow';

export default {
  nameSpace: 'lasec',
  version: '1.0.0',
  name: 'lasec-crm',
  dependencies: [],
  graphDefinitions: {
    Resolvers: lasecResolvers,
    Types: [...lasecTypes],
  },
  workflows: [...lasecWorkflows],
};
