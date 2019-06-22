import logger from '../../../logging';
import { fileAsString } from '../../../utils/io';
import lasecTypes from '../../../modules/lasec/graph/types';

const typeDefs = [];

/**
 * Type imports defined by order of definition
 */
[
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
  'Communications/Notification',
  'Custom/FuniSaveGateway',
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.info(`Adding ${fileName} to graph`);
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default [...typeDefs, ...lasecTypes];
