
import { loadGraphQLTypeDefinitions } from '@reactory/server-core/graph/graphql-loader';

const CoreTypeDefinitions = loadGraphQLTypeDefinitions([
  'Charts/ReactoryCharts',
  'System/Scalars',
  'System/Enums',
  'System/ApiStatus/ApiStatus',
  'System/Directives',
  'System/Menu',
  'System/ReactoryClient/ApplicationPlugin',
  'System/ReactoryClient/ApplicationTheme',
  'System/ReactoryClient/ReactoryClientEnums',
  'System/ReactoryClient/ReactoryClient',
  'System/Workflow',
  'System/Cache',
  'System/File',
  'System/UX',
  'System/Region',
  'System/Natural',
  'Forms/Form',
  'User/User',
  'User/Team',
  'User/Profile',
  'User/UserImport',
  'User/Support', 
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
], __dirname, 'CORE');

export default CoreTypeDefinitions;
