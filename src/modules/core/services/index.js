import moment from "moment";
import EmailService from './EmailService'
import TemplateService from './TemplateService'
import FileService from './FileService';
//custom services to be expressed here

const services = [  
  EmailService,
  TemplateService,
  FileService
]

export default services;