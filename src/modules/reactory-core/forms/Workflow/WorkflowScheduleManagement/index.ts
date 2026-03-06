import Reactory from '@reactorynet/reactory-core';
import version from './version';
import schema from './schema';
import { GridUISchema, ListUiSchema } from './uiSchema';
import graphql from './graphql';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';

const name = "WorkflowScheduleManagement";
const nameSpace = "core";

const WorkflowScheduleManagement: Reactory.Forms.IReactoryForm = {
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
  avatar: safeCDNUrl(`themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase()),
  registerAsComponent: true,
  title: 'Workflow Schedules',
  description: 'Manage scheduled workflow executions and recurring tasks',
  backButton: true,
  uiSupport: ['material'],
  graphql,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

export default WorkflowScheduleManagement;
