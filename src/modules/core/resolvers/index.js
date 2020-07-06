import ReactoryContent from './ReactoryContent';
import UserEmail from './Emails/UserEmails';
import { ProfileResolver, UserResolver } from './User';
import ReactorySQLResolver from './SQL/ReactorySQLResolver';
import { mergeGraphResolver } from '@reactory/server-core/utils';

export default mergeGraphResolver([
  UserResolver,
  UserEmail,
  ReactoryContent,
  ProfileResolver,
  ReactorySQLResolver
]);
