import moment from "moment";
import EmailService from './EmailService'
import TemplateService from './TemplateService'
import FileService from './FileService';
import { ReactoryExcelWriterServiceDefinition } from '@reactory/server-core/excel/ExcelWriter';
import OrganizationServiceDefinition from '@reactory/server-modules/core/services/OrganizationService';
import ImportServices from './ETL/ImportServices';
//custom services to be expressed here

const services = [
  ...ImportServices,
  EmailService,
  TemplateService,
  FileService,
  ReactoryExcelWriterServiceDefinition,
  OrganizationServiceDefinition,
]

export default services;