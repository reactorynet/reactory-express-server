import logger from '../../../logging';
import { fileAsString } from '../../../utils/io';

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

export default typeDefs;
