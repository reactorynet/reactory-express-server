import ReactoryContent from './ReactoryContent';
import UserEmail from './Emails/UserEmails';
import TemplateResolver from './Template/TemplateResolver';
import { ProfileResolver, UserResolver, UserImportResolver } from './User';
import ReactorySQLResolver from './SQL/ReactorySQLResolver';
import ReactoryCacheResolver from './Cache/CacheResolver';
import { mergeGraphResolver } from '@reactory/server-core/utils';
import SupportResolver from './Support/SupportResolver';

export default mergeGraphResolver([
  UserResolver,
  UserEmail,
  UserImportResolver,
  ReactoryContent,
  ProfileResolver,
  ReactorySQLResolver,
  ReactoryCacheResolver,
  TemplateResolver,
  SupportResolver.istance.resolver
]);
