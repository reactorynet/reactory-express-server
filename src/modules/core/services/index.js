import moment from "moment";
import EmailService from './EmailService'
import TemplateService from './TemplateService'
import FileService from './FileService';
import { ReactoryExcelWriterServiceDefinition } from '@reactory/server-core/excel/ExcelWriter';
//custom services to be expressed here

const services = [  
  EmailService,
  TemplateService,
  FileService,
  ReactoryExcelWriterServiceDefinition
]

export default services;