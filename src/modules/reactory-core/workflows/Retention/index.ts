/**
 * Retention YAML workflows (namespace: `core`).
 *
 * These are maintenance/retention jobs that operate on the workflow storage tree
 * under `$REACTORY_DATA/workflows`.
 *
 * Registration mirrors `workflows/examples/index.ts` and `workflows/Support`:
 * each file is loaded via `loadYamlWorkflow` (which provisions it into the
 * `$REACTORY_DATA` workflow catalog and parses it) and registered under `core`.
 *
 *   core.PurgeWorkflowArchives@1.0.0 — Ticket C: delete archive buckets older
 *                                     than a configurable window (default 180
 *                                     days). Dry run by default.
 *
 * Only workflows whose YAML file exists and parses are registered; failures are
 * skipped with a warning by `loadYamlWorkflow`.
 */

import Reactory from '@reactorynet/reactory-core';
import { loadYamlWorkflow } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/YamlToWorkflow';

const NS = 'core';
const VERSION = '1.0.0';

interface IRetentionWorkflowFile {
  /** Workflow name — the registered id is `${NS}.${name}@${VERSION}`. */
  name: string;
  /** File name relative to this directory. */
  filename: string;
}

const RETENTION_WORKFLOW_FILES: IRetentionWorkflowFile[] = [
  { name: 'PurgeWorkflowArchives', filename: 'PurgeWorkflowArchives.workflow.yaml' },
];

const retentionWorkflows: Reactory.Workflow.IWorkflow[] = RETENTION_WORKFLOW_FILES
  .map(({ name, filename }) => loadYamlWorkflow(NS, name, filename, VERSION, __dirname))
  .filter((w): w is Reactory.Workflow.IWorkflow => w !== null);

export default retentionWorkflows;
