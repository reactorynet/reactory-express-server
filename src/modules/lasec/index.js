import lasecResolvers from './resolvers';
import lasecTypes from './graph/types';

export default {
  nameSpace: 'lasec',
  version: '1.0.0',
  name: 'lasec-crm',
  dependencies: [],
  graphDefinitions: {
    Resolvers: lasecResolvers,
    Types: [...lasecTypes],
  },
};
