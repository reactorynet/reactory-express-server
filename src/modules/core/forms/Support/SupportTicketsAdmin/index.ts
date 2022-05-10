import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import modules from './modules';
import graphql from './graphql';

const name = "SupportTicketsAdmin";
const nameSpace = "core";

const SupportTickets: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiFramework: 'material',
  registerAsComponent: true,
  title: 'Support Tickets',
  backButton: true,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['USER', 'ADMIN']
}

export default SupportTickets;