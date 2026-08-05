/**
 * Engine smoke tests for the example YAML workflows.
 *
 * For each no-infra example, this parses the YAML, builds the workflow-es class
 * via the bridge, runs it on a real in-memory host, and asserts it completes.
 * This is the executable equivalent of running the examples on a live server —
 * but for the subset that needs no external services (DBs, AI, network, SMTP…).
 */

import * as fs from 'fs';
import * as path from 'path';
import { configureWorkflow, MemoryPersistenceProvider, WorkflowInstance } from '@reactorynet/workflow-es';
import { YamlFlowParser } from '../../../workflow/YamlFlow/YamlFlowParser';
import {
  buildYamlWorkflowClass,
  engineWorkflowId,
  engineWorkflowMajorVersion,
} from '../../../workflow/YamlFlow/YamlFlowBuilder';

const COMPLETE = 2;
const TERMINATED = 3;
const EXAMPLES_DIR = path.join(__dirname, '..');

// Examples that run with no external dependencies (the engine/control-flow set).
const NO_INFRA_EXAMPLES = [
  'EngineHello.yaml',
  'Variables.yaml',
  'Condition.yaml',
  'ForEach.yaml',
  'While.yaml',
  'Parallel.yaml',
  'Delay.yaml',
  'Todo.yaml',
  'Telemetry.yaml',
  'Custom.yaml',
  'FileRoundTrip.yaml',
  'Validation.yaml',
  'Saga.yaml',
];

// Integration examples — require external services to RUN, but must still parse
// and pass schema validation so they stay loadable via the module path.
const INFRA_EXAMPLES = [
  'ApiCall.yaml',
  'ServiceInvoke.yaml',
  'MongoQuery.yaml',
  'UserLookup.yaml',
  'GraphQLQuery.yaml',
  'WaitEvent.yaml',
  'AgentConversation.yaml',
  'AgentResearch.yaml',
  'WeeklyWeatherForecast.yaml',
  'Postgres.yaml',
  'Email.yaml',
  'Search.yaml',
  'CollectAgentContext.yaml',
];

async function runToCompletion(
  persistence: MemoryPersistenceProvider,
  id: string,
  timeoutMs = 8000,
): Promise<WorkflowInstance> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const instance = await persistence.getWorkflowInstance(id);
    if (instance && (instance.status === COMPLETE || instance.status === TERMINATED)) {
      return instance;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Workflow ${id} did not complete in ${timeoutMs}ms (status=${instance?.status})`);
    }
    await new Promise((r) => setTimeout(r, 40));
  }
}

describe('YAML example workflows (engine smoke tests)', () => {
  it.each(NO_INFRA_EXAMPLES)('parses and runs %s to completion', async (file) => {
    const parser = new YamlFlowParser({ validateSchema: false });
    const parsed = parser.parseFromFile(path.join(EXAMPLES_DIR, file));

    expect(parsed.success).toBe(true);
    expect(parsed.workflow).toBeDefined();

    const def = parsed.workflow as any;
    const persistence = new MemoryPersistenceProvider();
    const config = configureWorkflow();
    config.usePersistence(persistence);
    config.allowSingleNodeProviders(true);
    const host = config.getHost();
    host.registerWorkflow(buildYamlWorkflowClass(def));
    await host.start();

    try {
      const instanceId = await host.startWorkflow(
        engineWorkflowId(def),
        engineWorkflowMajorVersion(def.version),
        { inputs: {}, variables: {}, stepResults: {}, env: {}, outputs: {} },
      );
      const instance = await runToCompletion(persistence, instanceId);
      expect(instance.status).toBe(COMPLETE);
    } finally {
      await host.stop();
    }
    // These boot the workflow engine, register a generated workflow class, run
    // it to completion and poll persistence — comfortably past Jest's 5s
    // default, which is what failed here rather than the workflows themselves.
  }, 30000);

  it('found all example files on disk', () => {
    for (const file of NO_INFRA_EXAMPLES) {
      expect(fs.existsSync(path.join(EXAMPLES_DIR, file))).toBe(true);
    }
  });

  // Guards that examples remain loadable via the module path (loadYamlWorkflow
  // parses with schema validation ON). If this fails, a step type is likely
  // missing from WorkflowSchema.json's enum. Covers BOTH groups — schema
  // validation needs no external services.
  it.each([...NO_INFRA_EXAMPLES, ...INFRA_EXAMPLES])('passes schema validation: %s', (file) => {
    const parser = new YamlFlowParser({ validateSchema: true });
    const parsed = parser.parseFromFile(path.join(EXAMPLES_DIR, file));
    if (!parsed.success) {
      throw new Error(
        `${file} failed schema validation: ${parsed.errors.map((e) => e.message).join('; ')}`,
      );
    }
    expect(parsed.success).toBe(true);
  });

  it('found all example files on disk (incl. integration examples)', () => {
    for (const file of [...NO_INFRA_EXAMPLES, ...INFRA_EXAMPLES]) {
      expect(fs.existsSync(path.join(EXAMPLES_DIR, file))).toBe(true);
    }
  });
});
