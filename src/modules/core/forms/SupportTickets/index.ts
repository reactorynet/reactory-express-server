import { Reactory } from '@reactory/server-core/types/reactory';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import modules from './modules';
import graphql from './graphql';

const name = "SupportTickets";
const nameSpace = "core";

const SupportTickets: Reactory.IReactoryForm = {
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
}

export default SupportTickets;