import resolvers from './resolvers';
import graphTypes from './graph';
import workflows from './workflow';
import forms from './forms';
import services from './services';
import pdfs from './pdf';
import Reactory from '@reactory/reactory-core';
import { nameSpace, moduleName, } from './constants';

export const ServerModule: Reactory.Server.IReactoryModule = {
  nameSpace: nameSpace,
  version: "1.0.0",
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

export default ServerModule;