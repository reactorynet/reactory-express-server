
import Reactory from '@reactory/reactory-core';
import { SupportTicketSchemaResolver } from './schema';
import uiSchema, { argsUiSchema } from './uiSchema';
import graphql from './graphql';
import version from './version';
import modules from './modules';

import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const name = "SupportTicket";
const nameSpace = "core";


const SupportTicket: Reactory.Forms.IReactoryForm = {
  id: 'core.SupportTicket@1.0.0',
  nameSpace: "core",
  name: "SupportTicket",
  version,
  title: "reactory:support-ticket.form.title",  
  description: 'reactory:support-ticket.form.description',
  icon: 'dynamic_form',
  avatar: `${ENVIRONMENT.CDN_ROOT}themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase(),
  registerAsComponent: true,  
  schema: SupportTicketSchemaResolver,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  uiSchemas: [],
  argsUiSchema,
  argsComponentFqn: null,  
  dependencies: [],
  exports: [],
  backButton: true,
  //graphql,
  uiResources: [],
  helpTopics: [],
  widgetMap: [
    // add custom widget maps
  ],
  modules
}

export default SupportTicket;