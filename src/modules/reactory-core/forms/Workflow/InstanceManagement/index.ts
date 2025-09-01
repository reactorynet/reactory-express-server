import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';

const name = "WorkflowInstanceManagement";
const nameSpace = "core";

const InstanceManagement: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiFramework: 'material',
  registerAsComponent: true,
  title: 'Workflow Instance Management',
  backButton: true,
  uiSupport: ['material'],
  graphql,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR'],
  description: 'Monitor and manage workflow instance execution, status, and lifecycle'
};

export default InstanceManagement;
