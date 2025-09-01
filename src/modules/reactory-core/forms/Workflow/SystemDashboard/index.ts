import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';

const name = "WorkflowSystemDashboard";
const nameSpace = "core";

const SystemDashboard: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiFramework: 'material',
  registerAsComponent: true,
  title: 'Workflow System Dashboard',
  backButton: false,
  uiSupport: ['material'],
  graphql,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR'],
  description: 'System-wide dashboard for monitoring workflow engine health and status'
};

export default SystemDashboard;
