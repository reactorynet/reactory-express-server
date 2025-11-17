import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';

const name = "WorkflowLauncher";  
const nameSpace = "core";

const WorkflowLauncher: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiFramework: 'material',
  registerAsComponent: true,
  title: 'Workflow Launcher',
  backButton: true,
  uiSupport: ['material'],
  graphql,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR', 'USER'],
  description: 'Launch workflow instances with custom parameters and scheduling options',
  submitHandler: 'launchWorkflow'
};

export default WorkflowLauncher;
