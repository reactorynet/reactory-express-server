
import logger from '@reactory/server-core/logging';
import { fileAsString } from '@reactory/server-core/utils/io';

const typeDefs: string[] = [];

[
  'Charts/ReactoryCharts',
  'System/Scalars',
  'System/Enums',
  'System/Directives',
  'System/Menu',
  'System/ReactoryClient',
  'System/Workflow',
  'System/Cache',
  'System/File',
  'System/UX',
  'System/Region',
  'Forms/Form',
  'User/User',
  'User/Team',
  'User/Profile',
  'User/UserImport',
  'User/Support',
  'Project/Project',
  'Project/Task',
  'Organization/Organization',
  'Organization/BusinessUnit',
  'System/Email',
  'System/Template',
  'System/Translations',
  'System/Statistics',
  'System/ReactoryContent',
  'Communications/Notification',
  'SQL/ReactorySQL',
  'Finance/Payments',
].forEach((name) => {
  try {
    const fileName = `./${name}.graphql`;
    logger.debug(`Adding [CORE][${fileName}]`);
    const source = fileAsString(require.resolve(fileName));
    typeDefs.push(`${source}`);
  } catch (e) {
    logger.error(`Error loading type definition, please check file: ${name}`, { error: e });
  }
});

export default typeDefs;
