
import logger from '../../../../logging';
import { fileAsString } from '../../../../utils/io';

const typeDefs = [];

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
  'System/Statistics',
  'System/Content',
  'Communications/Notification',
  'Custom/FuniSaveGateway',
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.debug(`Loading ${fileName} - Graph definitions For Core`);
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default typeDefs;
