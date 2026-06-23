/**
 * Integration tests for the YAML → workflow-es bridge (YamlFlowBuilder).
 *
 * These build a workflow class from a YAML-style definition, register it with a
 * real in-memory workflow-es host, run it to completion, and assert the data
 * flow + control flow produced by the engine. Steps execute through the actual
 * IYamlStep registry (core defaults), so this exercises the full path end to end
 * for steps that do not require Reactory services (set_variable, log).
 */

import {
  configureWorkflow,
  MemoryPersistenceProvider,
  WorkflowInstance,
} from '@reactorynet/workflow-es';
import * as os from 'os';
import * as path from 'path';
import {
  buildYamlWorkflowClass,
  engineWorkflowId,
  engineWorkflowMajorVersion,
} from '../YamlFlowBuilder';
import { InstanceResourceManager } from '../../InstanceResourceManager';
import { finalizeInstanceIfTerminal } from '../execution/YamlStepBody';

// workflow-es numeric statuses: Runnable=0, Suspended=1, Complete=2, Terminated=3
const COMPLETE = 2;
const TERMINATED = 3;

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
      throw new Error(
        `Workflow ${id} did not complete within ${timeoutMs}ms (status=${instance?.status})`,
      );
    }
    await new Promise((r) => setTimeout(r, 40));
  }
}

function freshData(extra: Record<string, any> = {}) {
  return { inputs: {}, variables: {}, stepResults: {}, env: {}, outputs: {}, ...extra };
}

describe('YamlFlowBuilder (engine bridge)', () => {
  describe('id / version helpers', () => {
    it('derives engine id and numeric version', () => {
      const def = { nameSpace: 'test', name: 'sample', version: '2.3.1' };
      expect(engineWorkflowId(def)).toBe('test.sample@2.3.1');
      expect(engineWorkflowMajorVersion('2.3.1')).toBe(2);
      expect(engineWorkflowMajorVersion('1.0.0')).toBe(1);
      expect(engineWorkflowMajorVersion('')).toBe(1);
    });
  });

  describe('end-to-end execution', () => {
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

    async function start(def: any, data: any): Promise<WorkflowInstance> {
      const config = configureWorkflow();
      config.usePersistence(persistence);
      config.allowSingleNodeProviders(true);
      host = config.getHost();
      host.registerWorkflow(buildYamlWorkflowClass(def));
      await host.start();
      const id = await host.startWorkflow(
        engineWorkflowId(def),
        engineWorkflowMajorVersion(def.version),
        data,
      );
      return runToCompletion(persistence, id);
    }

    it('runs sequential set_variable steps and persists variables', async () => {
      const def = {
        nameSpace: 'test',
        name: 'sequential',
        version: '1.0.0',
        steps: [
          { id: 's1', type: 'set_variable', config: { action: 'set', key: 'greeting', value: 'hello' } },
          {
            id: 's2',
            type: 'set_variable',
            dependsOn: ['s1'],
            config: { action: 'set', key: 'copied', source: 'step_output', sourcePath: 's1.outputs.value' },
          },
        ],
      };

      const instance = await start(def, freshData());
      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.greeting).toBe('hello');
      expect(instance.data.variables.copied).toBe('hello');
    });

    it('executes the then-branch of a condition when true', async () => {
      const def = {
        nameSpace: 'test',
        name: 'conditional',
        version: '1.0.0',
        steps: [
          { id: 'seed', type: 'set_variable', config: { action: 'set', key: 'n', value: 7 } },
          {
            id: 'branch',
            type: 'condition',
            dependsOn: ['seed'],
            config: {
              condition: 'variables.n > 3',
              thenSteps: [
                { id: 'big', type: 'set_variable', config: { action: 'set', key: 'size', value: 'big' } },
              ],
              elseSteps: [
                { id: 'small', type: 'set_variable', config: { action: 'set', key: 'size', value: 'small' } },
              ],
            },
          },
        ],
      };

      const instance = await start(def, freshData());
      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.size).toBe('big');
    });

    it('iterates a for_each and exposes the item variable', async () => {
      const def = {
        nameSpace: 'test',
        name: 'loop',
        version: '1.0.0',
        steps: [
          { id: 'seed', type: 'set_variable', config: { action: 'set', key: 'numbers', value: [10, 20, 30] } },
          {
            id: 'each',
            type: 'for_each',
            dependsOn: ['seed'],
            config: {
              items: 'variables.numbers',
              itemVariable: 'currentItem',
              steps: [
                { id: 'touch', type: 'log', config: { message: 'item ${currentItem}', level: 'debug' } },
              ],
            },
          },
        ],
      };

      const instance = await start(def, freshData());
      expect(instance.status).toBe(COMPLETE);
      // The item variable holds (at least) one of the iterated elements.
      expect([10, 20, 30]).toContain(instance.data.variables.currentItem);
    });

    it('runs a while loop body and terminates', async () => {
      const def = {
        nameSpace: 'test',
        name: 'whileloop',
        version: '1.0.0',
        steps: [
          { id: 'seed', type: 'set_variable', config: { action: 'set', key: 'done', value: false } },
          {
            id: 'loop',
            type: 'while',
            dependsOn: ['seed'],
            config: {
              condition: 'variables.done !== true',
              steps: [
                { id: 'finish', type: 'set_variable', config: { action: 'set', key: 'done', value: true } },
              ],
            },
          },
        ],
      };

      const instance = await start(def, freshData());
      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.done).toBe(true);
    });

    it('runs parallel branches and joins', async () => {
      const def = {
        nameSpace: 'test',
        name: 'par',
        version: '1.0.0',
        steps: [
          { id: 'seed', type: 'set_variable', config: { action: 'set', key: 'start', value: true } },
          {
            id: 'fork',
            type: 'parallel',
            dependsOn: ['seed'],
            config: {
              branches: [
                { name: 'a', steps: [{ id: 'setA', type: 'set_variable', config: { action: 'set', key: 'a', value: 1 } }] },
                { name: 'b', steps: [{ id: 'setB', type: 'set_variable', config: { action: 'set', key: 'b', value: 2 } }] },
              ],
            },
          },
        ],
      };

      const instance = await start(def, freshData());
      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.a).toBe(1);
      expect(instance.data.variables.b).toBe(2);
    });

    it('runs a saga body on the happy path without compensating', async () => {
      const def = {
        nameSpace: 'test',
        name: 'saga',
        version: '1.0.0',
        steps: [
          {
            id: 'tx',
            type: 'saga',
            config: {
              steps: [{ id: 'work', type: 'set_variable', config: { action: 'set', key: 'sagaRan', value: true } }],
              compensate: [{ id: 'undo', type: 'set_variable', config: { action: 'set', key: 'compensated', value: true } }],
            },
          },
        ],
      };

      const instance = await start(def, freshData());
      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.sagaRan).toBe(true);
      expect(instance.data.variables.compensated).toBeUndefined();
    });

    it('suspends on wait_event and resumes when the event is published', async () => {
      const def = {
        nameSpace: 'test',
        name: 'waiter',
        version: '1.0.0',
        steps: [
          {
            id: 'await-approval',
            type: 'wait_event',
            config: {
              eventName: 'approval',
              eventKey: 'input.requestId',
              outputVariable: 'approval',
            },
          },
        ],
      };

      const config = configureWorkflow();
      config.usePersistence(persistence);
      config.allowSingleNodeProviders(true);
      host = config.getHost();
      host.registerWorkflow(buildYamlWorkflowClass(def));
      await host.start();

      const id = await host.startWorkflow(
        engineWorkflowId(def),
        engineWorkflowMajorVersion(def.version),
        freshData({ inputs: { requestId: 'req-1' } }),
      );

      // Give the engine a moment to reach the waitFor, then publish the event.
      await new Promise((r) => setTimeout(r, 300));
      await host.publishEvent('approval', 'req-1', { approved: true }, new Date());

      const instance = await runToCompletion(persistence, id);
      expect(instance.status).toBe(COMPLETE);
      expect(instance.data.variables.approval).toEqual({ approved: true });
    });
  });

  // Durability: the WorkflowRunner's out-of-graph sweeper closes the instance
  // log manager once a run reaches a terminal state — on SUCCESS and on FAILURE.
  // finalizeInstanceIfTerminal is the unit the sweeper invokes per instance.
  describe('durable finalize on terminal status', () => {
    let prevData: string | undefined;

    beforeEach(() => {
      // Ensure REACTORY_DATA is set so the IRM is actually created (and thus its
      // closure is observable). Use a temp dir when the env doesn't set one.
      prevData = process.env.REACTORY_DATA;
      if (!prevData) {
        process.env.REACTORY_DATA = path.join(os.tmpdir(), 'yamlflow-test-data');
      }
    });

    afterEach(() => {
      if (prevData === undefined) delete process.env.REACTORY_DATA;
    });

    const makeManager = (instanceId: string) => {
      const mgr = new InstanceResourceManager('test', 'finalize', '1.0.0', instanceId);
      InstanceResourceManager.register(instanceId, mgr);
      return mgr;
    };

    it('closes the manager when the instance has TERMINATED (failed)', async () => {
      const id = 'inst-terminated-1';
      makeManager(id);
      expect(InstanceResourceManager.forInstance(id)).not.toBeNull();

      const persistence = { getWorkflowInstance: async () => ({ status: 3 }) }; // Terminated
      const finalized = await finalizeInstanceIfTerminal(persistence, id);

      expect(finalized).toBe(true);
      expect(InstanceResourceManager.forInstance(id)).toBeNull(); // closed + unregistered
    });

    it('closes the manager when the instance has COMPLETED', async () => {
      const id = 'inst-complete-1';
      makeManager(id);

      const persistence = { getWorkflowInstance: async () => ({ status: 2 }) }; // Complete
      const finalized = await finalizeInstanceIfTerminal(persistence, id);

      expect(finalized).toBe(true);
      expect(InstanceResourceManager.forInstance(id)).toBeNull();
    });

    it('leaves the manager open while the instance is still runnable', async () => {
      const id = 'inst-running-1';
      const mgr = makeManager(id);

      const persistence = { getWorkflowInstance: async () => ({ status: 0 }) }; // Runnable
      const finalized = await finalizeInstanceIfTerminal(persistence, id);

      expect(finalized).toBe(false);
      expect(InstanceResourceManager.forInstance(id)).not.toBeNull(); // still open

      await mgr.close(); // cleanup
    });
  });
});
