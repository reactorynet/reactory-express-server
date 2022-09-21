import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import { GridUISchema, ListUiSchema } from './uiSchema';
import modules from './modules';
import graphql from './graphql';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const name = "SupportTickets";
const nameSpace = "core";



const SupportTickets: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema: GridUISchema,
  uiSchemas: [
    { 
      id: 'default',
      description: 'Grid Schema',
      icon: 'table',
      key: 'default',
      title: 'Paginated Table',
      uiSchema: GridUISchema
    },
    {
      id: 'list',
      description: 'List',
      icon: 'list',
      key: 'list',
      title: 'Infinite List',
      uiSchema: ListUiSchema
    }
  ],
  uiFramework: 'material',
  avatar: `${ENVIRONMENT.CDN_ROOT}themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase(),
  registerAsComponent: true,
  title: 'Support Tickets',
  description: 'Returns a list of active support tickets for the logged in user',
  backButton: true,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['USER']
}

export default SupportTickets;