/**
 * wait_event timeout contract — REACTORY-302016408.
 *
 * A `wait_event` step used to accept a `timeout` and set the event subscription's
 * effective date to `now + timeout`. The engine matches a subscription as
 * `subscribeAsOf <= event.eventTime` (a LOWER BOUND on the event's publish time,
 * not a deadline), and the queue worker marks every delivered event processed
 * whether or not a subscription matched it. So a timeout made the wait DEAF for
 * its duration: an event published inside the window matched nothing, was marked
 * processed, and the signal was LOST — after which the wait never ended (there is
 * no timer for an event-wait pointer).
 *
 * The fix rejects `timeout` on `wait_event` at validation time, with a message
 * naming the supported alternative: publish a sentinel event at the deadline on
 * the same eventName/eventKey. These tests pin:
 *
 *   1. the rejection on every validation path (definition build, registry-aware
 *      executor validation, and YAML-document validation) with the same message;
 *   2. recursion into nested scopes (a timeout inside a for_each body is just as
 *      deaf as a top-level one) and rejection of a top-level `step.timeout`;
 *   3. that a rejected definition cannot be registered or run;
 *   4. the regression baseline — a wait_event WITHOUT a timeout still validates,
 *      suspends and resumes;
 *   5. the in-window-signal-loss case specifically: an event published immediately
 *      after the wait is armed MUST resume the workflow. The armed subscription's
 *      watermark is asserted to be in the past, because a future watermark is the
 *      mechanism that swallowed the signal.
 */

import {
  configureWorkflow,
  MemoryPersistenceProvider,
  WorkflowInstance,
} from '@reactorynet/workflow-es';
import { buildYamlWorkflowClass, engineWorkflowId } from '../YamlFlowBuilder';
import { YamlWorkflowExecutor } from '../execution/YamlWorkflowExecutor';
import { YamlStepRegistry } from '../steps/registry/YamlStepRegistry';
import { YamlValidator } from '../validators/YamlValidator';
import {
  WAIT_EVENT_TIMEOUT_CODE,
  findWaitEventTimeoutViolations,
  waitEventTimeoutMessage,
} from '../validators/WaitEventTimeoutContract';

/** workflow-es numeric statuses. */
const COMPLETE = 2;
const TERMINATED = 3;

/** Resume cycles ride the engine's poll worker; give them more than jest's 5s. */
const ENGINE_TEST_TIMEOUT_MS = 30000;
jest.setTimeout(ENGINE_TEST_TIMEOUT_MS);

function freshData(extra: Record<string, any> = {}) {
  return { inputs: {}, variables: {}, stepResults: {}, env: {}, outputs: {}, ...extra };
}

/** A minimal, otherwise-valid workflow wrapping a single wait_event step. */
function waiterDefinition(waitConfig: Record<string, any>, extraSteps: any[] = []) {
  return {
    nameSpace: 'test',
    name: 'waiter-validation',
    version: '1.0.0',
    steps: [
      {
        id: 'awaitApproval',
        type: 'wait_event',
        config: { eventName: 'approval', eventKey: 'input.requestId', ...waitConfig },
      },
      ...extraSteps,
    ],
  };
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 15000,
  label = 'condition',
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}`);
}

async function runToCompletion(
  persistence: MemoryPersistenceProvider,
  id: string,
  timeoutMs = 20000,
): Promise<WorkflowInstance> {
  let instance: WorkflowInstance | undefined;
  await waitFor(
    async () => {
      instance = await persistence.getWorkflowInstance(id);
      return !!instance && (instance.status === COMPLETE || instance.status === TERMINATED);
    },
    timeoutMs,
    `workflow ${id} to reach a terminal state`,
  );
  return instance!;
}

describe('wait_event timeout contract', () => {
  describe('a declared timeout is rejected at definition load', () => {
    it('throws from buildYamlWorkflowClass and names the sentinel-event alternative', () => {
      const def = waiterDefinition({ timeout: 5000 });

      expect(() => buildYamlWorkflowClass(def as any)).toThrow(WAIT_EVENT_TIMEOUT_CODE);

      let message = '';
      try {
        buildYamlWorkflowClass(def as any);
      } catch (err) {
        message = (err as Error).message;
      }

      // Actionable, not just "invalid": says WHY and WHAT TO DO INSTEAD.
      expect(message).toContain("Step 'awaitApproval' (wait_event)");
      expect(message).toContain("sets 'timeout' at steps[awaitApproval].config.timeout");
      expect(message).toContain("'timeout' is not supported on wait_event");
      expect(message).toContain('publish a sentinel event at the deadline');
      expect(message).toContain("eventName ('approval')");
      expect(message).toContain('branch on its payload');
    });

    it('rejects a timeout at nesting depth — a for_each body is not exempt', () => {
      const def = {
        nameSpace: 'test',
        name: 'nested-waiter',
        version: '1.0.0',
        steps: [
          {
            id: 'each',
            type: 'for_each',
            config: {
              items: [1, 2],
              itemVariable: 'ticket',
              steps: [
                {
                  id: 'awaitTicket',
                  type: 'wait_event',
                  config: { eventName: 'ticket-closed', timeout: 60000 },
                },
              ],
            },
          },
        ],
      };

      const violations = findWaitEventTimeoutViolations(def.steps);
      expect(violations).toHaveLength(1);
      expect(violations[0].stepId).toBe('awaitTicket');
      expect(violations[0].eventName).toBe('ticket-closed');
      expect(violations[0].path).toBe('steps[each].steps[awaitTicket].config.timeout');

      expect(() => buildYamlWorkflowClass(def as any)).toThrow(
        /awaitTicket.*'timeout' is not supported/s,
      );
    });

    it('rejects a condition branch and a top-level step.timeout, which were both silently ignored', () => {
      const inBranch = {
        nameSpace: 'test',
        name: 'branch-waiter',
        version: '1.0.0',
        steps: [
          {
            id: 'gate',
            type: 'condition',
            config: {
              condition: 'input.needsApproval',
              thenSteps: [
                {
                  id: 'awaitInBranch',
                  type: 'wait_event',
                  config: { eventName: 'approval', timeout: 1000 },
                },
              ],
            },
          },
        ],
      };
      expect(findWaitEventTimeoutViolations(inBranch.steps).map((v) => v.stepId)).toEqual([
        'awaitInBranch',
      ]);

      // `step.timeout` is schema-legal, but on a suspending step it can never fire.
      const topLevel = {
        nameSpace: 'test',
        name: 'toplevel-waiter',
        version: '1.0.0',
        steps: [{ id: 'awaitApproval', type: 'wait_event', timeout: 1000, config: { eventName: 'approval' } }],
      };
      const violations = findWaitEventTimeoutViolations(topLevel.steps);
      expect(violations).toHaveLength(1);
      expect(violations[0].path).toBe('steps[awaitApproval].timeout');
    });

    it('reports every offending wait_event, not just the first', () => {
      const def = {
        nameSpace: 'test',
        name: 'two-waiters',
        version: '1.0.0',
        steps: [
          { id: 'first', type: 'wait_event', config: { eventName: 'a', timeout: 1000 } },
          { id: 'second', type: 'wait_event', config: { eventName: 'b', timeout: 2000 } },
        ],
      };

      let message = '';
      try {
        buildYamlWorkflowClass(def as any);
      } catch (err) {
        message = (err as Error).message;
      }
      expect(message).toContain('2 invalid wait_event steps');
      expect(message).toContain("Step 'first'");
      expect(message).toContain("Step 'second'");
    });

    it('does not reject timeout: null — that is "no timeout", which the schema allows', () => {
      const def = waiterDefinition({ timeout: null });
      expect(() => buildYamlWorkflowClass(def as any)).not.toThrow();
    });
  });

  // The designer persists step `config`/`inputs` as JSON STRINGS, so the walker has
  // to parse before it can see a timeout; and every nested step scope is a place a
  // timeout can hide. These four cases exercise those branches directly.
  describe('serialized config/inputs and nested scopes', () => {
    it('rejects a timeout inside a JSON-string `config` (the designer shape)', () => {
      const def = {
        nameSpace: 'test',
        name: 'json-config-waiter',
        version: '1.0.0',
        steps: [
          {
            id: 'awaitApproval',
            type: 'wait_event',
            config: JSON.stringify({ eventName: 'approval', eventKey: 'input.requestId', timeout: 5000 }),
          },
        ],
      };

      const violations = findWaitEventTimeoutViolations(def.steps);
      expect(violations).toHaveLength(1);
      expect(violations[0].stepId).toBe('awaitApproval');
      // eventName is resolved out of the parsed string, not left blank.
      expect(violations[0].eventName).toBe('approval');
      expect(violations[0].path).toBe('steps[awaitApproval].config.timeout');

      expect(() => buildYamlWorkflowClass(def as any)).toThrow(WAIT_EVENT_TIMEOUT_CODE);
    });

    it('rejects a timeout inside a JSON-string `inputs` and reports the inputs path', () => {
      const def = {
        nameSpace: 'test',
        name: 'json-inputs-waiter',
        version: '1.0.0',
        steps: [
          {
            id: 'awaitApproval',
            type: 'wait_event',
            inputs: JSON.stringify({ eventName: 'approval', timeout: 5000 }),
          },
        ],
      };

      const violations = findWaitEventTimeoutViolations(def.steps);
      expect(violations).toHaveLength(1);
      expect(violations[0].eventName).toBe('approval');
      expect(violations[0].path).toBe('steps[awaitApproval].inputs.timeout');
      expect(waitEventTimeoutMessage(violations[0])).toContain("'timeout' is not supported on wait_event");
    });

    it('rejects a timeout inside a parallel branch', () => {
      const def = {
        nameSpace: 'test',
        name: 'parallel-waiter',
        version: '1.0.0',
        steps: [
          {
            id: 'fanout',
            type: 'parallel',
            config: {
              branches: [
                {
                  steps: [
                    { id: 'branchWait', type: 'wait_event', config: { eventName: 'a', timeout: 1000 } },
                  ],
                },
                {
                  steps: [
                    {
                      id: 'deepBranchWait',
                      type: 'wait_event',
                      inputs: { eventName: 'b', timeout: 2000 },
                    },
                  ],
                },
                { steps: [{ id: 'noop', type: 'log', config: { message: 'hi' } }] },
              ],
            },
          },
        ],
      };

      const violations = findWaitEventTimeoutViolations(def.steps);
      expect(violations.map((v) => v.stepId)).toEqual(['branchWait', 'deepBranchWait']);
      expect(violations[1].path).toBe('steps[fanout].steps[deepBranchWait].inputs.timeout');
      expect(() => buildYamlWorkflowClass(def as any)).toThrow(/2 invalid wait_event steps/);
    });

    it('rejects a timeout inside saga compensation', () => {
      const def = {
        nameSpace: 'test',
        name: 'saga-waiter',
        version: '1.0.0',
        steps: [
          {
            id: 'txn',
            type: 'saga',
            config: {
              steps: [{ id: 'reserve', type: 'log', config: { message: 'reserved' } }],
              compensate: [
                {
                  id: 'awaitRollbackAck',
                  type: 'wait_event',
                  config: { eventName: 'rollback-ack', timeout: 1000 },
                },
              ],
            },
          },
        ],
      };

      const violations = findWaitEventTimeoutViolations(def.steps);
      expect(violations.map((v) => v.stepId)).toEqual(['awaitRollbackAck']);
      expect(violations[0].eventName).toBe('rollback-ack');
      expect(() => buildYamlWorkflowClass(def as any)).toThrow(WAIT_EVENT_TIMEOUT_CODE);
    });

    // Unparseable JSON must not throw from the walker (it is a validator, not a
    // parser): the step simply yields no violation, exactly like the builder's own
    // config fallback. Guards the catch branch of parseJsonObject.
    it('does not throw on unparseable JSON in config or inputs', () => {
      const def = {
        nameSpace: 'test',
        name: 'broken-json-waiter',
        version: '1.0.0',
        steps: [
          { id: 'brokenConfig', type: 'wait_event', config: '{not valid json' },
          { id: 'brokenInputs', type: 'wait_event', inputs: '[also not json' },
        ],
      };

      expect(findWaitEventTimeoutViolations(def.steps)).toEqual([]);
      expect(() => buildYamlWorkflowClass(def as any)).not.toThrow();
    });
  });

  describe('validation surfaces, all sharing one message', () => {
    it('YamlWorkflowExecutor.validateWorkflow reports the rejection with the shared code', async () => {
      const executor = new YamlWorkflowExecutor(new YamlStepRegistry());

      const invalid = await executor.validateWorkflow(waiterDefinition({ timeout: 5000 }) as any);
      expect(invalid.valid).toBe(false);
      const error = invalid.errors.find((e: any) => e.code === WAIT_EVENT_TIMEOUT_CODE);
      expect(error).toBeDefined();
      expect(error!.stepId).toBe('awaitApproval');
      expect(error!.path).toBe('steps[awaitApproval].config.timeout');
      expect(error!.message).toContain('publish a sentinel event at the deadline');

      // Regression: the same step without a timeout validates cleanly.
      const valid = await executor.validateWorkflow(waiterDefinition({}) as any);
      expect(valid.valid).toBe(true);
      expect(valid.errors).toEqual([]);
    });

    it('YamlValidator.parseAndValidate rejects the YAML document', () => {
      const yamlContent = [
        'nameSpace: test',
        'name: yaml-waiter',
        'version: 1.0.0',
        'description: wait_event with a timeout',
        'steps:',
        '  - id: awaitApproval',
        '    type: wait_event',
        '    config:',
        '      eventName: approval',
        '      eventKey: input.requestId',
        '      timeout: 5000',
      ].join('\n');

      const result = new YamlValidator().parseAndValidate(yamlContent);

      expect(result.success).toBe(false);
      expect(result.workflow).toBeUndefined();
      const error = (result.errors || []).find((e: any) => e.code === WAIT_EVENT_TIMEOUT_CODE);
      expect(error).toBeDefined();
      expect(error!.message).toContain('publish a sentinel event at the deadline');
    });
  });

  describe('a rejected definition cannot be registered or run', () => {
    it('never reaches the host and cannot be started', async () => {
      const persistence = new MemoryPersistenceProvider();
      const config = configureWorkflow();
      config.usePersistence(persistence);
      config.allowSingleNodeProviders(true);
      const host = config.getHost();
      await host.start();

      const def = waiterDefinition({ timeout: 5000 });

      // This is the exact call WorkflowRunner.registerYamlWorkflowOnHost makes, so a
      // throw here means the definition fails at load/registration — not at run time.
      expect(() => {
        const WorkflowClass = buildYamlWorkflowClass(def as any);
        host.registerWorkflow(WorkflowClass as any);
      }).toThrow(WAIT_EVENT_TIMEOUT_CODE);

      // Nothing was registered, so a start attempt cannot produce an instance.
      let started: string | undefined;
      try {
        started = await host.startWorkflow(
          engineWorkflowId(def as any),
          def.version,
          freshData({ inputs: { requestId: 'req-1' } }),
        );
      } catch {
        started = undefined;
      }
      expect(started).toBeUndefined();

      await host.stop();
    });
  });

  describe('wait_event without a timeout (regression)', () => {
    let persistence: MemoryPersistenceProvider;
    let host: any;

    beforeEach(() => {
      persistence = new MemoryPersistenceProvider();
    });

    afterEach(async () => {
      if (host) {
        await host.stop();
        host = null;
      }
    });

    async function armAndStart(def: any): Promise<string> {
      const config = configureWorkflow();
      config.usePersistence(persistence);
      config.allowSingleNodeProviders(true);
      host = config.getHost();
      host.registerWorkflow(buildYamlWorkflowClass(def));
      await host.start();
      return host.startWorkflow(
        engineWorkflowId(def),
        def.version,
        freshData({ inputs: { requestId: 'req-1' } }),
      );
    }

    it('suspends, then resumes when the event is published immediately after arming', async () => {
      const def = waiterDefinition(
        { outputVariable: 'approval' },
        [
          {
            id: 'afterApproval',
            type: 'set_variable',
            dependsOn: 'awaitApproval',
            config: { action: 'set', key: 'resumed', value: true },
          },
        ],
      );

      const id = await armAndStart(def);

      // Wait until the instance is actually armed on the subscription.
      await waitFor(
        async () => {
          const instance = await persistence.getWorkflowInstance(id);
          return !!(instance?.executionPointers || []).some(
            (p: any) => p.eventName === 'approval' && !p.eventPublished,
          );
        },
        15000,
        `instance ${id} to subscribe to 'approval'`,
      );

      // THE PIN: the armed subscription must accept an event published NOW.
      // A future subscribeAsOf (what `timeout` used to produce) returns [] here,
      // which is exactly how the in-window signal was being discarded.
      const armed = await persistence.getWorkflowInstance(id);
      const tenantId = (armed as any)?.tenantId || 'default';
      const matching = await persistence.getSubscriptions(
        tenantId,
        'approval',
        'req-1',
        new Date(),
      );
      expect(matching).toHaveLength(1);
      expect(new Date((matching[0] as any).subscribeAsOf).getTime()).toBeLessThanOrEqual(Date.now());

      // Publish with no dwell at all — the event is "in flight" the moment the
      // wait is armed, the worst case for the old future-watermark behaviour.
      await host.publishEvent('approval', 'req-1', { approved: true }, new Date());

      const instance = await runToCompletion(persistence, id);
      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.approval).toEqual({ approved: true });
      // The step AFTER the wait ran, so the workflow genuinely advanced.
      expect(instance.data.variables.resumed).toBe(true);
    });
  });
});
