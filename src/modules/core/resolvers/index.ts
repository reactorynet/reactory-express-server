import ApiStatus from './ApiStatus';
import OrganizationResolver from './Organization/OrganizationResolver';
import BusinessUnitResolver from './Organization/BusinessUnitResolver';
import ProjectResolver from './Organization/ProjectResolver';
import TeamResolver from './Organization/TeamResolver';
import ReactoryContent from './ReactoryContent';
import UserEmail from './Emails/UserEmails';
import TemplateResolver from './Template/TemplateResolver';
import { 
  ProfileResolver, 
  UserResolver, 
  UserImportResolver,
  UserMembershipResolver
 } from './User';
import ReactorySQLResolver from './SQL/ReactorySQLResolver';
import ReactoryCacheResolver from './Cache/CacheResolver';
import ReactoryFileResolver from './ReactoryFile/ReactoryFile';
import SupportResolver from './Support/SupportResolver';
import Resources from './System/Resources';
import Statistics from './System/Statistics';
import { ReactoryClientResolver, ClientComponentResolver, ClientRouteResolver } from './System/ReactoryClientResolver';
import ReactoryForm from './ReactoryForm';
import { mergeGraphResolver } from '@reactory/server-core/utils';

export default mergeGraphResolver([
  ApiStatus,
  ReactoryClientResolver,
  ClientComponentResolver,
  ClientRouteResolver,
  OrganizationResolver,
  BusinessUnitResolver,
  ProjectResolver,
  Resources,
  Statistics,
  TeamResolver,
  UserResolver,
  UserEmail,
  UserImportResolver,
  UserMembershipResolver,
  ReactoryContent,
  ProfileResolver,
  ReactorySQLResolver,
  ReactoryCacheResolver,
  ReactoryFileResolver,
  TemplateResolver,
  SupportResolver,
  ReactoryForm,

]);
