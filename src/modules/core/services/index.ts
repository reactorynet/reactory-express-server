import moment from "moment";
import EmailService from './EmailService'
import TemplateService from './TemplateService'
import FileService from './FileService';
import { ReactoryExcelWriterServiceDefinition } from '@reactory/server-core/excel/ExcelWriter';
import OrganizationServiceDefinition from '@reactory/server-modules/core/services/OrganizationService';
import GoogleMapsService from "./location/GoogleMapsService";
import Processors from './ETL/Processors';
import ReactoryPackageManager from './ETL/ReactoryPackageManager';
import UserService from './UserService';
import WorkflowService from './ReactoryWorkflowService';
import FetchService from './FetchService';
import PdfService from './PdfService';
import ReactorySupportService from "./SupportService";
import SystemService from './SystemService';
import ReactoryFormService from './FormService';
import ReactoryModuleCompilerService from './ReactoryModuleCompilerService';
import ReactoryTranslationService from "./TranslationService";
import ReactoryContentService from './ReactoryContentService';
import ReactoryNLPService from './ReactoryNLPService';
import ReactoryModelRegistry from "./ReactoryModelRegistryService";
//custom services to be expressed here


const services = [
  GoogleMapsService,
  ...Processors,
  EmailService,
  TemplateService,
  FileService,
  ReactoryExcelWriterServiceDefinition,
  OrganizationServiceDefinition,
  ReactoryPackageManager.reactory,
  UserService.reactory,
  WorkflowService.definition,
  FetchService.reactory,
  PdfService.reactory,
  ReactorySupportService.reactory,
  SystemService.reactory,
  ReactoryFormService.reactory,
  ReactoryModuleCompilerService.reactory,
  ReactoryTranslationService.reactory,
  ReactoryContentService.reactory,
  ReactoryNLPService,
  ReactoryModelRegistry
]

export default services;