import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';

const name = "WorkflowOperationsDashboard";
const nameSpace = "core";

const OperationsDashboard: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiFramework: 'material',
  registerAsComponent: true,
  title: 'Workflow Operations Dashboard',
  backButton: false,
  uiSupport: ['material'],
  graphql,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR', 'USER'],
  description: 'Real-time operational dashboard for workflow monitoring and metrics',
  helpTopics: [
    'workflow-operations-dashboard-help'
  ]
};

export default OperationsDashboard;
