import resolvers from './resolvers';
import graphTypes from './graph';
import workflows from './workflow';
import forms from './forms';
import services from './services';
import pdfs from './pdf';
import { Reactory } from '@reactory/server-core/types/reactory';
import { nameSpace, moduleName, moduleVersion } from './constants';

export const ReactoryDevops: Reactory.IReactoryModule = {
  nameSpace: nameSpace,
  version: moduleVersion,
  name: moduleName,
  dependencies: [],
  priority: 0,
  graphDefinitions: {
    Resolvers: resolvers,
    Types: [...graphTypes],
  },
  workflows: [...workflows],
  forms: [ ...forms ],
  services: [ ...services ],
  pdfs: [...pdfs] 
};

export default ReactoryDevops;