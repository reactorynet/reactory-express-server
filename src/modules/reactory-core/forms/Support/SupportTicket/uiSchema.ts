import { getUISchema } from '@reactory/server-core/schema/reflection';
import SupportTicketModel from '../models/SupportTicket/SupportTicket.view.model';

const uiSchema: Reactory.Schema.TServerUISchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.TServerUISchema> => { 
  return getUISchema(SupportTicketModel, {}, "grid", form, context, info);
}

export default uiSchema;