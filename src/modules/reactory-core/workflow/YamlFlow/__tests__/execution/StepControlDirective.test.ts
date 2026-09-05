/**
 * Tests for the durable step control directive.
 *
 * A module-contributed leaf step can ask the durable engine to suspend — either
 * until an external event arrives (`control.waitForEvent`) or for a duration
 * (`control.sleep`) — without being hardcoded into YamlFlowBuilder's
 * STRUCTURAL_TYPES. These tests pin the contract that the Temporal steps (and any
 * future integration) rely on:
 *
 *   1. a waitForEvent directive suspends the instance and the SAME step re-runs
 *      with the event payload;
 *   2. step outputs are recorded BEFORE the suspend, so the resumed run can read
 *      them back (the only state channel available across an event suspend);
 *   3. a sleep directive re-runs the step with its persisted state;
 *   4. a resumed step cannot re-suspend on the same event (no suspend loop);
 *   5. a directive on a FAILED result is ignored — failure handling wins;
 *   6. the standalone executor, which cannot suspend, fails the step with a clear
 *      message instead of silently continuing.
 */

import {
  configureWorkflow,
  MemoryPersistenceProvider,
  WorkflowInstance,
} from '@reactorynet/workflow-es';
import { buildYamlWorkflowClass, engineWorkflowId } from '../../YamlFlowBuilder';
import { YamlStepRegistry } from '../../steps/registry/YamlStepRegistry';
import { BaseYamlStep } from '../../steps/base/BaseYamlStep';
import { YamlWorkflowExecutor } from '../../execution/YamlWorkflowExecutor';
import { configureYamlFlowRuntime } from '../../execution/YamlFlowRuntime';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../steps/interfaces/IYamlStep';

const COMPLETE = 2;
const TERMINATED = 3;
/** Retries exhausted — the engine's terminal state for a step that keeps failing. */
const DEAD_LETTERED = 4;

/**
 * These tests drive a real workflow-es host: a suspend/resume cycle waits on the
 * engine's poll worker, which takes longer than jest's 5s default per-test budget.
 */
const ENGINE_TEST_TIMEOUT_MS = 30000;
jest.setTimeout(ENGINE_TEST_TIMEOUT_MS);

function freshData(extra: Record<string, any> = {}) {
  return { inputs: {}, variables: {}, stepResults: {}, env: {}, outputs: {}, ...extra };
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 8000,
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
      return (
        !!instance &&
        (instance.status === COMPLETE ||
          instance.status === TERMINATED ||
          instance.status === DEAD_LETTERED)
      );
    },
    timeoutMs,
    `workflow ${id} to reach a terminal state`,
  );
  return instance!;
}

/**
 * Wait until the instance is parked on an event subscription.
 *
 * NOTE: `ExecutionResult.waitForEvent` does NOT move the instance to Suspended —
 * that status is reserved for an explicit suspendWorkflow(). A step waiting on an
 * event is observable as an execution pointer carrying `eventName` that has not yet
 * been satisfied (`eventPublished` false), which is the same predicate
 * ReactoryWorkflowService.signalWorkflowInstance uses.
 */
async function waitForEventSubscription(
  persistence: MemoryPersistenceProvider,
  id: string,
  eventName: string,
  timeoutMs = 20000,
): Promise<void> {
  await waitFor(
    async () => {
      const instance = await persistence.getWorkflowInstance(id);
      return !!(instance?.executionPointers || []).some(
        (pointer: any) => pointer.eventName === eventName && !pointer.eventPublished,
      );
    },
    timeoutMs,
    `instance ${id} to subscribe to '${eventName}'`,
  );
}

/** Records every run so the tests can assert re-run behaviour. */
const runLog: Array<Record<string, any>> = [];

/**
 * A step that suspends on an event the first time it runs and finalises on resume,
 * mirroring how TemporalWorkflowStep uses the directive.
 */
class EventSuspendStep extends BaseYamlStep {
  public readonly stepType = 'test_event_suspend';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const resumed = context.control?.eventPublished === true;
    runLog.push({
      step: this.id,
      resumed,
      workflow: context.workflow,
      eventData: context.control?.eventData,
      // Proves outputs recorded before the suspend are readable on resume.
      priorOutputs: context.stepResults?.[this.id]?.outputs,
      supportsSuspend: context.control?.supportsSuspend,
    });

    if (resumed) {
      context.variables.settledWith = context.control?.eventData;
      context.variables.correlationSeenOnResume = context.stepResults?.[this.id]?.outputs?.correlation;
      return { success: true, outputs: { phase: 'resumed' }, metadata: {} };
    }

    return {
      success: true,
      outputs: { phase: 'suspending', correlation: this.config.eventKey },
      metadata: {},
      control: {
        waitForEvent: { eventName: this.config.eventName, eventKey: this.config.eventKey },
      },
    };
  }
}

/** A step that sleeps until it has run `iterations` times. */
class SleepPollStep extends BaseYamlStep {
  public readonly stepType = 'test_sleep_poll';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const state = (context.control?.persistenceData || {}) as { ticks?: number };
    const ticks = (state.ticks || 0) + 1;
    runLog.push({ step: this.id, ticks, persistenceData: context.control?.persistenceData });

    if (ticks >= (this.config.iterations || 2)) {
      context.variables.pollTicks = ticks;
      return { success: true, outputs: { ticks, done: true }, metadata: {} };
    }

    return {
      success: true,
      outputs: { ticks, done: false },
      metadata: {},
      control: { sleep: { durationMs: 10 }, persist: { ticks } },
    };
  }
}

/** A failing step that ALSO returns a directive — the failure must win. */
class FailingSuspendStep extends BaseYamlStep {
  public readonly stepType = 'test_failing_suspend';

  protected async executeStep(): Promise<StepExecutionResult> {
    return {
      success: false,
      error: 'deliberate failure',
      outputs: {},
      metadata: {},
      control: { waitForEvent: { eventName: 'never', eventKey: 'never' } },
    };
  }
}

function registryWithTestSteps(): YamlStepRegistry {
  const registry = new YamlStepRegistry();
  registry.registerStep('test_event_suspend', EventSuspendStep as any, {}, undefined, 'module');
  registry.registerStep('test_sleep_poll', SleepPollStep as any, {}, undefined, 'module');
  registry.registerStep('test_failing_suspend', FailingSuspendStep as any, {}, undefined, 'module');
  return registry;
}

describe('durable step control directives', () => {
  let persistence: MemoryPersistenceProvider;
  let host: any;

  beforeEach(() => {
    runLog.length = 0;
    persistence = new MemoryPersistenceProvider();
    // YamlStepBody resolves steps through the shared runtime registry.
    configureYamlFlowRuntime({ registry: registryWithTestSteps(), systemContext: null });
  });

  afterEach(async () => {
    if (host) {
      await host.stop();
      host = null;
    }
  });

  /**
   * @param pollIntervalMs the engine's poll-worker cadence. A durable `sleep` is
   *   resumed by that worker, so a test asserting sleep behaviour must run the host
   *   at its minimum (1000ms) rather than the 10s production default.
   */
  async function startOnHost(def: any, data: any, pollIntervalMs?: number): Promise<string> {
    const config = configureWorkflow(pollIntervalMs ? { pollIntervalMs } : undefined);
    config.usePersistence(persistence);
    config.allowSingleNodeProviders(true);
    host = config.getHost();
    host.registerWorkflow(buildYamlWorkflowClass(def));
    await host.start();
    return host.startWorkflow(engineWorkflowId(def), def.version, data);
  }

  describe('waitForEvent', () => {
    const def = {
      nameSpace: 'test',
      name: 'control-event',
      version: '1.0.0',
      steps: [
        {
          id: 'awaitOutcome',
          type: 'test_event_suspend',
          config: { eventName: 'temporal.workflow.settled', eventKey: 'run-1' },
        },
      ],
    };

    it('suspends the instance and resumes the same step with the event payload', async () => {
      const id = await startOnHost(def, freshData());

      await waitForEventSubscription(persistence, id, 'temporal.workflow.settled');

      // Only the first (suspending) run has happened so far.
      expect(runLog).toHaveLength(1);
      expect(runLog[0].resumed).toBe(false);
      expect(runLog[0].supportsSuspend).toBe(true);

      await host.publishEvent(
        'temporal.workflow.settled',
        'run-1',
        { status: 'COMPLETED', result: 42 },
        new Date(),
      );

      const instance = await runToCompletion(persistence, id);
      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.settledWith).toEqual({ status: 'COMPLETED', result: 42 });

      // The step body ran twice: suspend, then resume.
      expect(runLog).toHaveLength(2);
      expect(runLog[1].resumed).toBe(true);
    });

    it('records step outputs before suspending so the resumed run can read them', async () => {
      const id = await startOnHost(def, freshData());

      await waitForEventSubscription(persistence, id, 'temporal.workflow.settled');

      // The pre-suspend outputs are durable: visible on the parked instance.
      const suspended = await persistence.getWorkflowInstance(id);
      expect(suspended.data.stepResults.awaitOutcome.outputs).toEqual({
        phase: 'suspending',
        correlation: 'run-1',
      });

      await host.publishEvent('temporal.workflow.settled', 'run-1', { status: 'COMPLETED' }, new Date());
      const instance = await runToCompletion(persistence, id);

      // ...and readable by the step itself on resume, which is the only state
      // channel available across an event suspension.
      expect(runLog[1].priorOutputs).toEqual({ phase: 'suspending', correlation: 'run-1' });
      expect(instance.data.variables.correlationSeenOnResume).toBe('run-1');
    });

    it('does not re-suspend a resumed step on the same event', async () => {
      const id = await startOnHost(def, freshData());
      await waitForEventSubscription(persistence, id, 'temporal.workflow.settled');

      await host.publishEvent('temporal.workflow.settled', 'run-1', { status: 'COMPLETED' }, new Date());
      const instance = await runToCompletion(persistence, id);

      // Completed rather than parking again, and the body ran exactly twice.
      expect(instance.status).toBe(COMPLETE);
      expect(runLog.filter((entry) => entry.step === 'awaitOutcome')).toHaveLength(2);
    });
  });

  describe('workflow identity exposed to steps', () => {
    /**
     * A step that arranges an external wake-up (a Temporal completion watch, a user
     * task callback) must record WHICH instance to wake and under WHICH tenant.
     *
     * Both were previously unavailable: workflow data is built before
     * host.startWorkflow() returns, so __workflow.instanceId is an empty placeholder,
     * and the engine tenant was never surfaced at all. The result was a watch with no
     * instance id (delivery could not be verified) published under the executing
     * context's partner instead of the instance's tenant — the event matched no
     * subscription and the parked instance waited forever.
     */
    it('gives the step the real engine instance id and tenant', async () => {
      const def = {
        nameSpace: 'test',
        name: 'identity',
        version: '1.0.0',
        steps: [
          {
            id: 'awaitOutcome',
            type: 'test_event_suspend',
            config: { eventName: 'temporal.workflow.settled', eventKey: 'run-identity' },
          },
        ],
      };

      const config = configureWorkflow();
      config.usePersistence(persistence);
      config.allowSingleNodeProviders(true);
      host = config.getHost();
      host.registerWorkflow(buildYamlWorkflowClass(def));
      await host.start();

      // Start under an explicit tenant, as WorkflowRunner does from partner.key.
      const id = await host.startWorkflow(
        engineWorkflowId(def),
        def.version,
        freshData({ __workflow: { id: 'test.identity@1.0.0', instanceId: '', nameSpace: 'test', name: 'identity', version: '1.0.0' } }),
        'acme',
      );

      await waitForEventSubscription(persistence, id, 'temporal.workflow.settled');

      expect(runLog).toHaveLength(1);
      // The engine's id, not the empty placeholder carried in the workflow data.
      expect(runLog[0].workflow.instanceId).toBe(id);
      expect(runLog[0].workflow.instanceId).not.toBe('');
      expect(runLog[0].workflow.tenantId).toBe('acme');
      // Definition metadata from the data is preserved alongside it.
      expect(runLog[0].workflow.name).toBe('identity');
    });
  });

  describe('sleep', () => {
    it('re-runs the step after the sleep with its persisted state', async () => {
      const def = {
        nameSpace: 'test',
        name: 'control-sleep',
        version: '1.0.0',
        steps: [{ id: 'poll', type: 'test_sleep_poll', config: { iterations: 3 } }],
      };

      // Two sleeps at the engine's minimum poll cadence.
      const id = await startOnHost(def, freshData(), 1000);
      const instance = await runToCompletion(persistence, id);

      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.pollTicks).toBe(3);

      // Three runs, each seeing the tick count persisted by the previous one.
      const ticks = runLog.filter((entry) => entry.step === 'poll').map((entry) => entry.ticks);
      expect(ticks).toEqual([1, 2, 3]);
      expect(runLog[1].persistenceData).toMatchObject({ ticks: 1 });
      expect(runLog[2].persistenceData).toMatchObject({ ticks: 2 });
    });
  });

  describe('failure handling wins over a directive', () => {
    it('terminates instead of suspending when the step result is a failure', async () => {
      const def = {
        nameSpace: 'test',
        name: 'control-failure',
        version: '1.0.0',
        steps: [
          {
            id: 'boom',
            type: 'test_failing_suspend',
            // The engine's default error behaviour is Retry; bound the budget so the
            // run reaches its terminal state promptly instead of retrying for the
            // duration of the test.
            retryPolicy: { maxAttempts: 0, initialDelay: 1 },
            config: {},
          },
        ],
      };

      const id = await startOnHost(def, freshData());
      const instance = await runToCompletion(persistence, id);

      // Terminal because the step FAILED — never parked on the event it asked for.
      expect([TERMINATED, DEAD_LETTERED]).toContain(instance.status);
      const parked = (instance.executionPointers || []).some((pointer: any) => pointer.eventName);
      expect(parked).toBe(false);
    });
  });

  describe('standalone executor (no suspend support)', () => {
    it('advertises supportsSuspend: false and fails a step that asks to suspend', async () => {
      const registry = registryWithTestSteps();
      const executor = new YamlWorkflowExecutor(registry);

      const result = await executor.executeWorkflow({
        nameSpace: 'test',
        name: 'no-suspend',
        version: '1.0.0',
        steps: [
          {
            id: 'awaitOutcome',
            type: 'test_event_suspend',
            config: { eventName: 'temporal.workflow.settled', eventKey: 'run-1' },
          },
        ],
      } as any);

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/cannot suspend an execution/i);
      expect(runLog[0].supportsSuspend).toBe(false);
    });
  });
});
