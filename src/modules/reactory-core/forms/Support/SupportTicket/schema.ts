import Reactory from '@reactory/reactory-core';
import { getTypeSchema } from '@reactory/server-core/schema/reflection';
import SupportTicketViewModel from '../models/SupportTicket.view.model';

export const SupportTicketSchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {

  const { i18n, user } = context;

  const instance: SupportTicketViewModel = new SupportTicketViewModel();
  // @ts-ignore
  const $schema = getTypeSchema<SupportTicketViewModel>(instance, context);
  context.state.schema = $schema
  return $schema.schema;
}
