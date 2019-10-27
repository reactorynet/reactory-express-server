import path from 'path';

import logger from '../../../logging';
import { fileAsString } from '../../../utils/io';
// import lasecTypes from '../../../modules/lasec/graph/types';

import modules from '../../../modules';


const typeDefs = [];

/**
 * Type imports defined by order of definition
 */
[
  /*
  'System/Scalars',
  'System/Enums',
  'System/Directives',
  'System/Menu',
  'System/ReactoryClient',
  'System/Workflow',
  'Forms/Form',
  'User/User',
  'User/Team',
  'Project/Project',
  'Project/Task',
  'Organization/Organization',
  'Organization/BusinessUnit',
  'Organization/LeadershipBrand',
  'Survey/Survey',
  'Survey/Assessment',
  'System/Email',
  'System/Template',
  'System/Statistics',
  'Communications/Notification',
  'Custom/FuniSaveGateway',
  */
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.debug(`Loading ${name} - Graph definitions`);
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});


modules.enabled.forEach((installedModule) => {
/**
    "id": "0c22819f-bca0-4947-b662-9190063c8277",
    "name": "Lasec",
    "key": "lasec",
    "fqn": "lasec.LasecCRM@1.0.0",
    "moduleEntry": "./lasec/index.js",
    "license": "commercial",
    "shop": "https://reactory.net/shop/modules/0c22819f-bca0-4947-b662-9190063c8277/"
 */
  if (installedModule.graphDefinitions) {
    logger.debug(`Extending Reactory Graph Types ${installedModule.name}`);
    if (installedModule.graphDefinitions.Types) {
      installedModule.graphDefinitions.Types.forEach((typeDef) => {
        typeDefs.push(typeDef);
      });
    }
  }
});


export default typeDefs;
