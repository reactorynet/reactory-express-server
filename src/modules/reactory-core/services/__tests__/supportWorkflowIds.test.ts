/**
 * Drift guard for the workflow ids the AI dispatcher starts.
 *
 * `ReactoryWorkflowService.startWorkflow` parses the version out of the id and the
 * runner matches the id verbatim — it does NOT resolve "latest". A version bump in
 * the module YAML therefore breaks dispatch until this service's constant is updated
 * too. That is exactly how `dispatchAiTickets` ended up pinned to
 * `core.ProcessAITicket@1.2.0` while only `1.3.0` existed.
 *
 * The canonical definition is the module YAML (`src/modules/reactory-reactor/workflow/
 * <Name>.yaml`), which `loadYamlWorkflow` re-provisions into the data catalog on every
 * start. Note `src/modules/*` is gitignored — the reactor module is a standalone
 * checkout — so in a server-only checkout (CI) the fixture is absent and the module
 * assertions are skipped rather than failed. They run wherever the module is present,
 * which is where a version bump is actually made.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import {
  PROCESS_AI_TICKET_WORKFLOW_ID,
  REQUEST_AI_ROUTING_WORKFLOW_ID,
} from '../supportWorkflowIds';

const MODULE_WORKFLOW_DIR = path.resolve(__dirname, '../../../reactory-reactor/workflow');

/** Declared identity of a module workflow YAML, or null when the module is absent. */
const moduleWorkflow = (name: string): { nameSpace?: string; name?: string; version?: string } | null => {
  const file = path.join(MODULE_WORKFLOW_DIR, `${name}.yaml`);
  if (!fs.existsSync(file)) return null;
  return (yaml.load(fs.readFileSync(file, 'utf8')) || {}) as Record<string, any>;
};

const hasModule = moduleWorkflow('ProcessAITicket') !== null;
const describeIfModule = hasModule ? describe : describe.skip;

/** `namespace.name@version`, composed the same way the dispatcher composes it. */
const idOf = (definition: { nameSpace?: string; name?: string; version?: string } | null): string | null =>
  definition?.nameSpace && definition?.name && definition?.version
    ? `${definition.nameSpace}.${definition.name}@${definition.version}`
    : null;

describeIfModule('support workflow dispatch ids', () => {
  it('starts the ProcessAITicket version the module YAML declares', () => {
    // If this fails, update PROCESS_AI_TICKET_WORKFLOW_ID in
    // ReactorySupportWorkflowService.ts to match the YAML — unless the YAML bump
    // itself was a mistake.
    expect(PROCESS_AI_TICKET_WORKFLOW_ID).toBe(idOf(moduleWorkflow('ProcessAITicket')));
  });

  it('starts the RequestAIRouting version the module YAML declares', () => {
    expect(REQUEST_AI_ROUTING_WORKFLOW_ID).toBe(idOf(moduleWorkflow('RequestAIRouting')));
  });

  it('pins a concrete semver on both ids (no "latest" resolution exists)', () => {
    for (const id of [PROCESS_AI_TICKET_WORKFLOW_ID, REQUEST_AI_ROUTING_WORKFLOW_ID]) {
      expect(id).toMatch(/^[a-zA-Z0-9_.-]+\.[a-zA-Z0-9_.-]+@\d+\.\d+\.\d+$/);
    }
  });
});

describe('support workflow dispatch ids (module-independent)', () => {
  it('names the workflows in the core namespace', () => {
    // Holds regardless of whether the reactor module is checked out.
    expect(PROCESS_AI_TICKET_WORKFLOW_ID).toMatch(/^core\.ProcessAITicket@/);
    expect(REQUEST_AI_ROUTING_WORKFLOW_ID).toMatch(/^core\.RequestAIRouting@/);
  });

  it('does not pin ProcessAITicket to the withdrawn 1.2.0 version', () => {
    // Regression guard: dispatch was pinned to core.ProcessAITicket@1.2.0 while only
    // 1.3.0 was registered, so every dispatch failed at start time.
    expect(PROCESS_AI_TICKET_WORKFLOW_ID).not.toBe('core.ProcessAITicket@1.2.0');
  });
});
