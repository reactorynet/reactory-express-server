import moment from "moment";
import EmailService from './EmailService'
import TemplateService from './TemplateService'
import FileService from './FileService';
//custom services to be expressed here

const services = [
  {
    id: 'core.hallo-world@1.0.0',
    name: "Reactory Hallo World Service",
    description: "Provides a Hallo World Server side response",
    service: (props, context)=>{
      return () => { `Hallo World ${moment().format('YYYY-MM-DD')}` };
    },
  },
  EmailService,
  TemplateService,
  FileService
]

export default services;