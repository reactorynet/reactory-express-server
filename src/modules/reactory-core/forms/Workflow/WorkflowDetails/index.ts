import schema from "./schema";
import graphql from "./graphql";
import modules from "./modules";
import uiSchema from "./uiSchema";
import Reactory from "@reactorynet/reactory-core";
import { safeCDNUrl } from "@reactory/server-core/utils/url/safeUrl";

const name = "WorkflowDetails";
const nameSpace = "core";
const version = '1.0.0';

const WorkflowDetails: Reactory.Forms.IReactoryForm = { 
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiFramework: 'material',
  avatar: safeCDNUrl(`themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase()),
  registerAsComponent: true,
  title: 'Workflow Details',
  description: 'View detailed information about a specific workflow, including its configuration, steps, and execution history.',
  backButton: true,
  uiSupport: ['material'],
  widgetMap: [
    { componentFqn: 'core.WorkflowDetailsPanel@1.0.0', widget: 'WorkflowDetailsPanel' },
    { componentFqn: 'core.WorkflowOverview@1.0.0', widget: 'WorkflowOverview' },
    { componentFqn: 'core.WorkflowInstanceHistory@1.0.0', widget: 'WorkflowInstanceHistory' },
    { componentFqn: 'core.WorkflowDataViewer@1.0.0', widget: 'WorkflowDataViewer' },
    { componentFqn: 'core.WorkflowInstanceInspector@1.0.0', widget: 'WorkflowInstanceInspector' },
    { componentFqn: 'core.WorkflowErrors@1.0.0', widget: 'WorkflowErrors' },
    { componentFqn: 'core.WorkflowSchedule@1.0.0', widget: 'WorkflowSchedule' },
    { componentFqn: 'core.WorkflowLaunch@1.0.0', widget: 'WorkflowLaunch' },
    { componentFqn: 'core.WorkflowConfiguration@1.0.0', widget: 'WorkflowConfiguration' },
    { componentFqn: 'core.WorkflowYamlView@1.0.0', widget: 'WorkflowYamlView' },
  ],
  modules,
  graphql,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR'] 
}

export default WorkflowDetails;