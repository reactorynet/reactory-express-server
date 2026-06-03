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
  modules,
  graphql,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR'] 
}

export default WorkflowDetails;