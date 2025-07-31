import ApiStatus from './ApiStatus';
import OrganizationResolver from './Organization/OrganizationResolver';
import Organization from './Organization/Organization';
import BusinessUnitResolver from './Organization/BusinessUnitResolver';
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
import ReactoryTranslationResolver from './System/ReactoryTranslation';
import ReactoryForm from './ReactoryForm';
import ReactoryMenuResolver from './Menu/MenuResolver';
import NaturalResolver from './System/NaturalResolver';

import { mergeGraphResolver } from '@reactory/server-core/utils';

export default mergeGraphResolver([
  ApiStatus,
  ReactoryClientResolver,
  ClientComponentResolver,
  ClientRouteResolver,
  OrganizationResolver,
  BusinessUnitResolver,
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
  Organization,
  ReactoryTranslationResolver,
  ReactoryMenuResolver,
  NaturalResolver
]);
