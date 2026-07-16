/**
 * Development utility workflows (reactory-dev namespace).
 *
 * These workflows encode common operations engineers perform during the
 * development lifecycle: committing changes, running tests, triggering
 * investigations, etc.
 *
 * Run any workflow on a live server with the GraphQL `startWorkflow` mutation:
 *   id: `reactory-dev.<Name>@1.0.0`
 */

import Reactory from '@reactorynet/reactory-core';
import { loadYamlWorkflow } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/YamlToWorkflow';

const NS = 'reactory-dev';
const VERSION = '1.0.0';

const DEV_WORKFLOW_NAMES: string[] = [
  'GitCommit',
  'RunServerTests',
  'RunClientTests',
  'RunWorkflowESTests',
  'BuildClient',
  'DeployServerPodman',
];

const devWorkflows: Reactory.Workflow.IWorkflow[] = DEV_WORKFLOW_NAMES
  .map((name) => loadYamlWorkflow(NS, name, `${name}.yaml`, VERSION, __dirname))
  .filter((w): w is Reactory.Workflow.IWorkflow => w !== null);

export default devWorkflows;
