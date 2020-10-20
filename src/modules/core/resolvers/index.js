import ReactoryContent from './ReactoryContent';
import UserEmail from './Emails/UserEmails';
import TemplateResolver from './Template/TemplateResolver';
import { ProfileResolver, UserResolver } from './User';
import ReactorySQLResolver from './SQL/ReactorySQLResolver';
import ReactoryCacheResolver from './Cache/CacheResolver';
import { mergeGraphResolver } from '@reactory/server-core/utils';

export default mergeGraphResolver([
  UserResolver,
  UserEmail,
  ReactoryContent,
  ProfileResolver,
  ReactorySQLResolver,
  ReactoryCacheResolver,
  TemplateResolver
]);
