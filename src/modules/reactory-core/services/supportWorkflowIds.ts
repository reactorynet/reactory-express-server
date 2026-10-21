/**
 * Workflow ids the AI dispatch path starts.
 *
 * WHY THIS IS ITS OWN MODULE
 * --------------------------
 * `ReactorySupportWorkflowService` transitively imports `reactory-communicator`,
 * which is an optional module and is absent from a server-only checkout. Keeping
 * these constants here lets `supportWorkflowIds.test.ts` assert them against the
 * canonical workflow definition without dragging that import graph (and the
 * resulting "skipped for absent module" classification) into CI.
 *
 * WHY THE VERSION IS EXPLICIT
 * ---------------------------
 * `ReactoryWorkflowService.startWorkflow` does NOT resolve "latest": it parses the
 * version out of the id (defaulting to `1.0.0`) and the runner matches the id
 * verbatim, so an unregistered version throws at start time.
 *
 * These MUST track `REACTOR_YAML_WORKFLOWS` in
 * `reactory-reactor/workflow/index.ts` — the canonical module registry, which
 * `loadYamlWorkflow` re-provisions into the data catalog on every start. A version
 * bump there must be mirrored here; `supportWorkflowIds.test.ts` fails when the two
 * disagree (wherever the module is checked out).
 */
export const PROCESS_AI_TICKET_WORKFLOW_ID = 'core.ProcessAITicket@1.4.4';
export const REQUEST_AI_ROUTING_WORKFLOW_ID = 'core.RequestAIRouting@1.0.0';
