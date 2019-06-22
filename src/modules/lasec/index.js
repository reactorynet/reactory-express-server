import lasecResolvers from './resolvers';
import lasecTypes from './graph/types';

export default {
  nameSpace: 'lasec',
  version: '0.0.1',
  name: 'lasec-crm',
  dependencies: [],
  graphDefinitions: {
    Resolvers: lasecResolvers,
    Types: [...lasecTypes],
  },
};
