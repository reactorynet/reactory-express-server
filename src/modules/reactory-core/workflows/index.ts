import CleanCacheWorkflow from './CleanCacheWorkflow';
import { loadYamlWorkflow } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/YamlToWorkflow';

// ─────────────────────────────────────────────
// Load all YAML workflow definitions
// ─────────────────────────────────────────────

const WORKFLOW_FILES = [
    { filename: 'DefaultUserOnboarding.yaml', nameSpace: 'reactory-core', name: 'DefaultUserOnboarding', version: '1.0.0' },    
];
const workflows: Reactory.Workflow.IWorkflow[] = WORKFLOW_FILES
    .map(({ nameSpace, name, filename, version }) => loadYamlWorkflow(nameSpace, name, filename, version))
    .filter((w): w is Reactory.Workflow.IWorkflow => w !== null);

workflows.push(CleanCacheWorkflow.meta);
export default workflows;

