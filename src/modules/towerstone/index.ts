import resolvers from './resolvers';
import graphTypes from './graph';
import workflows from './workflow';
import forms from './forms';
import services from './services';
import pdfs from './pdf';
import { Reactory } from 'types/reactory';

export const TowerStoneModule: Reactory.IReactoryModule = {
  nameSpace: 'towerstone',
  version: '1.0.0',
  name: 'Assessor',
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

export default TowerStoneModule;