import CleanCacheWorkflow from './CleanCacheWorkflow';
import { loadYamlWorkflow } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/YamlToWorkflow';
import exampleWorkflows from './examples';
import devWorkflows from './dev';

// ─────────────────────────────────────────────
// Load all YAML workflow definitions
// ─────────────────────────────────────────────

const WORKFLOW_FILES = [
    { filename: 'DefaultUserOnboarding.yaml', nameSpace: 'reactory-core', name: 'DefaultUserOnboarding', version: '1.0.0' },    
    { filename: 'DeployServer.yaml', nameSpace: 'core', name: 'DeployServer', version: '1.0.0' },
    { filename: 'DeployClient.yaml', nameSpace: 'core', name: 'DeployClient', version: '1.0.0' },
    { filename: 'SyncClusterData.yaml', nameSpace: 'core', name: 'SyncClusterData', version: '1.0.0' },
    { filename: 'VerifyDeployment.yaml', nameSpace: 'core', name: 'VerifyDeployment', version: '1.0.0' },
];
const workflows: Reactory.Workflow.IWorkflow[] = WORKFLOW_FILES
    .map(({ nameSpace, name, filename, version }) => loadYamlWorkflow(nameSpace, name, filename, version, __dirname))
    .filter((w): w is Reactory.Workflow.IWorkflow => w !== null);

workflows.push(CleanCacheWorkflow.meta);

// Example / smoke-test workflows (reactory-examples namespace)
workflows.push(...exampleWorkflows);

// Development utility workflows (reactory-dev namespace)
workflows.push(...devWorkflows);

export default workflows;

