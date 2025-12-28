import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import { GridUISchema, ListUiSchema } from './uiSchema';
import graphql from './graphql';
import modules from './modules';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const name = "WorkflowRegistryManagement";
const nameSpace = "core";

const WorkflowRegistryManagement: Reactory.Forms.IReactoryForm = {
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
  title: 'Workflow Registry',
  description: 'Browse and manage registered workflows in the system',
  backButton: true,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

export default WorkflowRegistryManagement;
