
import Reactory from '@reactory/reactory-core';
import { SupportTicketDeleteActionSchemaResolver } from './schema';
import uiSchema, { argsUiSchema } from './uiSchema';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const name = "SupportTicket";
const nameSpace = "core";


const SupportTicket: Reactory.Forms.IReactoryForm = {
  id: 'core.SupportTicketDeleteAction@1.0.0',
  nameSpace: "core",
  name: "SupportTicketDeleteAction",
  version: "1.0.0",
  title: "reactory:support-ticket.form.title",  
  description: 'reactory:support-ticket-delete-action.form.description',
  icon: 'dynamic_form',
  avatar: `${ENVIRONMENT.CDN_ROOT}themes/reactory/images/forms/${nameSpace}_${name}_1.0.0.png`.toLowerCase(),
  registerAsComponent: true,  
  schema: SupportTicketDeleteActionSchemaResolver,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  backButton: false
}

export default SupportTicket;