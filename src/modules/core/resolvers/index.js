import ReactoryContent from './ReactoryContent';
import UserEmail from './Emails/UserEmails';
import { ProfileResolver } from './User';
import ReactorySQLResolver from './SQL/ReactorySQLResolver';
import { mergeGraphResolver } from '@reactory/server-core/utils';

export default mergeGraphResolver([
  UserEmail,
  ReactoryContent,
  ProfileResolver,
  ReactorySQLResolver
]);
