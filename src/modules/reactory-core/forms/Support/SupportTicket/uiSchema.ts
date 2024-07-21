import { getTypeSchema } from '@reactory/server-core/schema/reflection';
import SupportTicketViewModel from '../models/SupportTicket.view.model';

/**
 * Default Froala options
 */
const froalaOptions = {
  imageManagerLoadMethod: 'GET',
  imageDefaultWidth: 300,
  imageDefaultDisplay: 'inline',
  imageUploadMethod: 'POST',
  fileUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/file',
  videoUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/video',
  imageUploadURL: '${formContext.reactory.API_ROOT}/froala/upload/image',
  requestHeaders: {
    'x-client-key': '${formContext.reactory.CLIENT_KEY}',
    'x-client-pwd': '${formContext.reactory.CLIENT_PWD}',
  },
};


export const argsUiSchema = {
  reference: {
    'ui:title': 'Enter Ticket Reference'
  }
}

const uiSchema: Reactory.Schema.TServerUISchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.TServerUISchema> => { 
  
  if (context.state.$schema !== undefined) { 
    return context.state.$schema.uiSchema;
  }

  const instance: SupportTicketViewModel = new SupportTicketViewModel();
  // @ts-ignore
  const $schema = getTypeSchema<SupportTicketViewModel>(instance, context);
  context.state.schema = $schema
  return $schema.uiSchema;
}

export default uiSchema;