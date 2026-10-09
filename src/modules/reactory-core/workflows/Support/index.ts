/**
 * Support YAML workflows (namespace: `core`).
 *
 * These implement the baseline support ticket TRIAGE and ESCALATION protocol
 * for tickets logged through the Reactory Support form.
 *
 * Registration mirrors `workflows/examples/index.ts`: each file is loaded via
 * `loadYamlWorkflow` (which provisions it into the $REACTORY_DATA workflow
 * catalog and parses it) and registered under the `core` namespace.
 *
 *   core.SupportAIAgentProcessNewTicket@1.0.0  — triage a single ticket (Susan)
 *   core.ListOpenTicketsWorkflow@1.0.0         — intake dispatcher (Phase 2, scheduled)
 *   core.TicketEscalationWorkflow@1.0.0        — SLA escalation  (Phase 3, hourly)
 *
 * NOTE: only workflows whose YAML file exists and parses are registered;
 * failures are skipped with a warning by loadYamlWorkflow.
 */

import Reactory from '@reactorynet/reactory-core';
import { loadYamlWorkflow } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/YamlToWorkflow';

const NS = 'core';
const VERSION = '1.0.0';

interface ISupportWorkflowFile {
  /** Workflow name — the registered id is `${NS}.${name}@${VERSION}`. */
  name: string;
  /** File name relative to this directory. */
  filename: string;
}

const SUPPORT_WORKFLOW_FILES: ISupportWorkflowFile[] = [
  { name: 'SupportAIAgentProcessNewTicket', filename: 'SupportAIAgentProcessNewTicket.workflow.yaml' },
  // Phase 2 — intake dispatcher (scheduled */10):
  { name: 'ListOpenTicketsWorkflow', filename: 'ListOpenTicketsWorkflow.workflow.yaml' },
  // Phase 3 — escalation (hourly):
  { name: 'TicketEscalationWorkflow', filename: 'TicketEscalationWorkflow.workflow.yaml' },
];

const supportWorkflows: Reactory.Workflow.IWorkflow[] = SUPPORT_WORKFLOW_FILES
  .map(({ name, filename }) => loadYamlWorkflow(NS, name, filename, VERSION, __dirname))
  .filter((w): w is Reactory.Workflow.IWorkflow => w !== null);

export default supportWorkflows;
