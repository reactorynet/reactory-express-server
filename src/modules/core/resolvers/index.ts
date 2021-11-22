import OrganizationResolver from './Organization/OrganizationResolver';
import BusinessUnitResolver from './Organization/BusinessUnitResolver';
import ProjectResolver from './Organization/ProjectResolver';
import TeamResolver from './Organization/TeamResolver';
import ReactoryContent from './ReactoryContent';
import UserEmail from './Emails/UserEmails';
import TemplateResolver from './Template/TemplateResolver';
import { ProfileResolver, UserResolver, UserImportResolver } from './User';
import ReactorySQLResolver from './SQL/ReactorySQLResolver';
import ReactoryCacheResolver from './Cache/CacheResolver';
import ReactoryFileResolver from './ReactoryFile/ReactoryFile';
import SupportResolver from './Support/SupportResolver';
import Resources from './System/Resources';


import { mergeGraphResolver } from '@reactory/server-core/utils';
import Statistics from './System/Statistics';
import ReactoryClient from './System/ReactoryClient';

export default mergeGraphResolver([
  ReactoryClient,
  OrganizationResolver,
  BusinessUnitResolver,
  ProjectResolver,
  Resources,
  Statistics,
  TeamResolver,
  UserResolver,
  UserEmail,
  UserImportResolver,
  ReactoryContent,
  ProfileResolver,
  ReactorySQLResolver,
  ReactoryCacheResolver,
  ReactoryFileResolver,
  TemplateResolver,
  SupportResolver
]);
