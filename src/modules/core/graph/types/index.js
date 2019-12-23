
import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';

const typeDefs = [];

[
  'System/Scalars',
  'System/Enums',
  'System/Directives',
  'System/Menu',
  'System/ReactoryClient',
  'System/Workflow',
  'Forms/Form',
  'System/UX',
  'User/User',
  'User/Team',
  'Project/Project',
  'Project/Task',
  'Organization/Organization',
  'Organization/BusinessUnit',
  'Organization/LeadershipBrand',
  'System/Email',
  'System/Template',
  'System/Statistics',
  'System/ReactoryContent',
  'Communications/Notification',
  'SQL/ReactorySQL',
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
