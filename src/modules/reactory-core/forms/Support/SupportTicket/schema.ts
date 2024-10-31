import Reactory from '@reactory/reactory-core';
import { getPropertySchema, getSchema, } from '@reactory/server-core/schema/reflection';
import SupportTicketModel from '../models/SupportTicket/SupportTicket.view.model';

export const SupportTicketSchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {
  return getSchema(SupportTicketModel, {}, context);
}
