import Reactory from '@reactory/reactory-core';
import { getTypeSchema } from '@reactory/server-core/schema/reflection';
import SupportTicketModel from '../models/SupportTicket.model';

export const SupportTicketSchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {

  const { i18n, user } = context;

  const instance: SupportTicketModel = new SupportTicketModel();
  const $schema = getTypeSchema<SupportTicketModel>(instance);

  return $schema;
}
