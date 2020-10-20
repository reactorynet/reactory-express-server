import lasecResolvers from './resolvers';
import lasecTypes from './graph/types';
import lasecWorkflows from './workflow';
import lasecForms from './forms';
import lasecServices from './services';


export { default as CONSTANTS } from './constants';


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
  forms: [...lasecForms],
  services: [...lasecServices]
};