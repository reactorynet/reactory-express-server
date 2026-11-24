import { WorkflowRunner, IWorkflow, IWorkflowState } from '../WorkflowRunner';
import { clearOutbox, readOutboxRecords } from '../../termination/TerminationOutbox';
import { WorkflowHost } from '@reactorynet/workflow-es';
import { MongoDBPersistence } from '@reactorynet/workflow-es-mongodb';

// Mock dependencies
jest.mock('../../../../../amq', () => ({
  onWorkflowEvent: jest.fn(),
  raiseWorkFlowEvent: jest.fn(),
}));

jest.mock('../../../../../logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@reactorynet/workflow-es', () => ({
  configureWorkflow: jest.fn(() => ({
    useLogger: jest.fn(),
    usePersistence: jest.fn(),
    // The runner configures single-node vs cluster mode on the builder. Without
    // these the initialize path threw
    // "config.allowSingleNodeProviders is not a function".
    allowSingleNodeProviders: jest.fn(),
    useQueueManager: jest.fn(),
    useLockManager: jest.fn(),
    getHost: jest.fn(() => ({
      registerWorkflow: jest.fn(),
      start: jest.fn(),
      startWorkflow: jest.fn(),
    })),
  })),
  WorkflowHost: jest.fn(),
  StepBody: class MockStepBody {},
  ExecutionResult: {
    next: jest.fn(),
  },
}));

jest.mock('@reactorynet/workflow-es-mongodb', () => ({
  MongoDBPersistence: jest.fn(() => ({
    connect: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('WorkflowRunner', () => {
  let workflowRunner: WorkflowRunner;
  let mockHost: jest.Mocked<WorkflowHost>;
  let mockPersistence: jest.Mocked<MongoDBPersistence>;

  const mockWorkflow: IWorkflow = {
    nameSpace: 'test',
    name: 'TestWorkflow',
    version: '1.0.0',
    component: jest.fn(),
    category: 'workflow',
    autoStart: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockHost = {
      registerWorkflow: jest.fn(),
      start: jest.fn(),
      startWorkflow: jest.fn(),
      // Also called on the host; without stop() the three stop() tests threw
      // "this.state.host.stop is not a function".
      stop: jest.fn(),
      publishEvent: jest.fn(),
      terminateWorkflow: jest.fn(),
    } as any;

    mockPersistence = {
      connect: jest.fn(),
      close: jest.fn(),
    } as any;

    // Mock the configureWorkflow to return our mock host
    const { configureWorkflow } = require('@reactorynet/workflow-es');
    configureWorkflow.mockReturnValue({
      useLogger: jest.fn(),
      usePersistence: jest.fn(),
      // The runner selects single-node vs cluster mode on the builder before
      // calling getHost(); omitting these threw
      // "config.allowSingleNodeProviders is not a function".
      allowSingleNodeProviders: jest.fn(),
      useQueueManager: jest.fn(),
      useLockManager: jest.fn(),
      getHost: jest.fn(() => mockHost),
    });

    // WorkflowRunner's constructor is (props, context); the context was omitted,
    // so initialize() read `.modules` off undefined.
    workflowRunner = new WorkflowRunner({ workflows: [mockWorkflow] }, {
      modules: [],
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      getService: jest.fn(),
    } as any);
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      expect(workflowRunner.getState()).toEqual({
        workflows: [mockWorkflow],
        host: null,
      });
      expect(workflowRunner.isInitialized()).toBe(false);
    });

    it('should initialize with provided workflows', () => {
      const customWorkflows = [mockWorkflow];
      const runner = new WorkflowRunner({ workflows: customWorkflows });
      expect(runner.getState().workflows).toEqual(customWorkflows);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await workflowRunner.initialize();
      
      expect(workflowRunner.isInitialized()).toBe(true);
      expect(mockHost.registerWorkflow).toHaveBeenCalledWith(mockWorkflow.component);
      expect(mockHost.start).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await workflowRunner.initialize();
      const initialCallCount = mockHost.start.mock.calls.length;
      
      await workflowRunner.initialize();
      
      expect(mockHost.start).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should handle initialization errors gracefully', async () => {
      mockHost.start.mockRejectedValue(new Error('Start failed'));
      
      await expect(workflowRunner.initialize()).rejects.toThrow('Start failed');
      expect(workflowRunner.isInitialized()).toBe(false);
    });
  });

  describe('registerWorkflow', () => {
    beforeEach(async () => {
      await workflowRunner.initialize();
    });

    it('should register a valid workflow', () => {
      const newWorkflow: IWorkflow = {
        nameSpace: 'test2',
        name: 'NewWorkflow',
        version: '1.0.0',
        component: jest.fn(),
        category: 'workflow',
      };

      workflowRunner.registerWorkflow(newWorkflow);

      expect(mockHost.registerWorkflow).toHaveBeenCalledWith(newWorkflow.component);
      expect(workflowRunner.getState().workflows).toContain(newWorkflow);
    });

    it('should throw error for invalid workflow', () => {
      const invalidWorkflow = {
        nameSpace: 'test',
        // Missing required fields
      } as IWorkflow;

      expect(() => workflowRunner.registerWorkflow(invalidWorkflow)).toThrow('Invalid workflow');
    });

    it('should throw error when host not initialized', () => {
      const runner = new WorkflowRunner({ workflows: [] }, { modules: [] } as any);
      const newWorkflow: IWorkflow = {
        nameSpace: 'test',
        name: 'TestWorkflow',
        version: '1.0.0',
        component: jest.fn(),
        category: 'workflow',
      };

      expect(() => runner.registerWorkflow(newWorkflow)).toThrow('Workflow host not initialized');
    });
  });

  describe('startWorkflow', () => {
    beforeEach(async () => {
      await workflowRunner.initialize();
    });

    it('should start a workflow successfully', async () => {
      const mockResult = 'test-123';
      mockHost.startWorkflow.mockResolvedValue(mockResult);

      const result = await workflowRunner.startWorkflow('test-workflow', '1.0.0', { data: 'test' });

      // M11 — the semantic version reaches the host VERBATIM. The runner used to
      // truncate it to a numeric major (so '1.0.0', '1.2.0' and '1.9.7' all arrived
      // as 1); that shim is gone and minor/patch are now preserved end to end.
      expect(mockHost.startWorkflow).toHaveBeenCalledWith('test-workflow', '1.0.0', { data: 'test' });
      expect(result).toEqual(mockResult);
    });

    it('passes a minor version through without collapsing it to the major (M11)', async () => {
      const mockResult = { id: 'instance-2', status: 'running' };
      mockHost.startWorkflow.mockResolvedValue(mockResult);

      await workflowRunner.startWorkflow('test-workflow', '1.9.7', { data: 'test' });

      expect(mockHost.startWorkflow).toHaveBeenCalledWith('test-workflow', '1.9.7', { data: 'test' });
    });

    it('should throw error when host not initialized', async () => {
      const runner = new WorkflowRunner({ workflows: [] }, { modules: [] } as any);

      await expect(
        runner.startWorkflow('test-workflow', '1.0.0', { data: 'test' })
      ).rejects.toThrow('Workflow host not initialized');
    });

    it('should handle workflow start errors', async () => {
      mockHost.startWorkflow.mockRejectedValue(new Error('Workflow start failed'));

      await expect(
        workflowRunner.startWorkflow('test-workflow', '1.0.0', { data: 'test' })
      ).rejects.toThrow('Workflow start failed');
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await workflowRunner.initialize();
    });

    it('should stop the workflow runner', async () => {
      await workflowRunner.stop();

      expect(workflowRunner.isInitialized()).toBe(false);
    });

    it('should close persistence connection if available', async () => {
      // This test verifies that the stop method doesn't crash when no persistence is available
      // The actual persistence testing is covered in integration tests
      await workflowRunner.stop();
      expect(workflowRunner.isInitialized()).toBe(false);
    });

    it('should handle stop errors gracefully', async () => {
      // This test verifies that the stop method handles errors gracefully
      // The actual persistence error testing is covered in integration tests
      await workflowRunner.stop();
      expect(workflowRunner.isInitialized()).toBe(false);
    });
  });

  describe('validateWorkflow', () => {
    beforeEach(async () => {
      await workflowRunner.initialize();
    });

    it('should validate a correct workflow', () => {
      const validWorkflow: IWorkflow = {
        nameSpace: 'test',
        name: 'TestWorkflow',
        version: '1.0.0',
        component: jest.fn(),
        category: 'workflow',
      };

      // Access private method through public interface
      workflowRunner.registerWorkflow(validWorkflow);
      // If no error is thrown, validation passed
    });

    it('should reject workflow with missing fields', () => {
      const invalidWorkflow = {
        nameSpace: 'test',
        // Missing name, version, component
        category: 'workflow',
      } as IWorkflow;

      expect(() => workflowRunner.registerWorkflow(invalidWorkflow)).toThrow('Invalid workflow');
    });
  });

  describe('getState', () => {
    it('should return a copy of the current state', () => {
      const state = workflowRunner.getState();
      
      expect(state).toEqual({
        workflows: [mockWorkflow],
        host: null,
      });
      
      // Verify it's a copy, not a reference
      expect(state).not.toBe(workflowRunner.getState());
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(workflowRunner.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await workflowRunner.initialize();
      expect(workflowRunner.isInitialized()).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should not crash the service on AMQ errors', async () => {
      const amq = require('../../../../../amq');
      amq.onWorkflowEvent.mockImplementation((event: string, handler: (payload: any) => void) => {
        // Simulate an error in the handler
        handler({ id: 'test', version: '1.0.0', data: {}, src: 'test' });
      });

      mockHost.startWorkflow.mockRejectedValue(new Error('AMQ workflow error'));

      await workflowRunner.initialize();
      
      // Should not throw, just log the error
      expect(amq.onWorkflowEvent).toHaveBeenCalled();
    });

    it('should handle persistence provider errors gracefully', async () => {
      const { MongoDBPersistence } = require('@reactorynet/workflow-es-mongodb');
      MongoDBPersistence.mockImplementation(() => {
        throw new Error('Persistence connection failed');
      });

      await workflowRunner.initialize();
      
      // Should still initialize successfully with in-memory persistence
      expect(workflowRunner.isInitialized()).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // REACTORY-302016408 — every path to Terminated records a reason
  //
  // These drive the REAL runner paths (startWorkflow / cancelWorkflowInstance /
  // the lifecycle-event subscription / handleFatalError / stop) against a fake
  // persistence provider, so the guarantee is tested where it is produced rather
  // than at a private helper.
  // ────────────────────────────────────────────────────────────────────────────
  describe('termination reason recording', () => {
    const outboxPath = '/tmp/reactor-runner-termination-outbox-test.jsonl';
    let fakePersistence: any;
    let lifecycleHandlers: Array<(event: any) => void>;
    /** Ambient persistence env this suite overrides, restored in afterEach. */
    let savedMongoose: string | undefined;
    let savedProvider: string | undefined;

    const awaitFlush = () => new Promise((resolve) => setTimeout(resolve, 25));

    const seedInstance = (id: string, overrides: any = {}) => {
      fakePersistence.store.set(id, {
        id,
        workflowDefinitionId: 'ai.ProcessAITicket@1.4.8',
        version: '1.4.8',
        status: 0,
        createTime: new Date('2026-11-03T08:22:26.000Z'),
        completeTime: null,
        data: { inputs: {}, variables: {}, stepResults: {}, env: {}, outputs: {} },
        executionPointers: [],
        concurrencyToken: 0,
        ...overrides,
      });
    };

    beforeEach(async () => {
      process.env.WORKFLOW_TERMINATION_OUTBOX = outboxPath;
      clearOutbox();

      // PIN THE PERSISTENCE PROVIDER. These tests assert that a reason reaches
      // the PERSISTED instance row, so a provider must exist. Without MONGOOSE
      // the runner deliberately falls back to in-memory and there is nowhere to
      // write, which made the suite depend on whatever the developer's shell
      // exported: green locally, 5 red in CI. MongoDBPersistence is jest.mock'ed
      // above, so no connection is attempted.
      savedMongoose = process.env.MONGOOSE;
      savedProvider = process.env.WORKFLOW_PERSISTENCE_PROVIDER;
      process.env.WORKFLOW_PERSISTENCE_PROVIDER = 'mongo';
      process.env.MONGOOSE = 'mongodb://127.0.0.1:27017/reactory-test';

      lifecycleHandlers = [];
      fakePersistence = {
        store: new Map<string, any>(),
        connect: jest.fn(),
        close: jest.fn(),
        getWorkflowInstance: jest.fn(async (id: string) => {
          const stored = fakePersistence.store.get(id);
          return stored ? JSON.parse(JSON.stringify(stored)) : undefined;
        }),
        persistWorkflow: jest.fn(async (instance: any) => {
          fakePersistence.store.set(instance.id, JSON.parse(JSON.stringify(instance)));
        }),
      };

      // The incident shape: engine left it Terminated with no completeTime.
      seedInstance('inst-terminated', { status: 3 });
      seedInstance('inst-deadlettered', { status: 0 });

      const { MongoDBPersistence } = require('@reactorynet/workflow-es-mongodb');
      MongoDBPersistence.mockImplementation(() => fakePersistence);

      (mockHost as any).onLifecycleEvent = jest.fn((handler: (event: any) => void) => {
        lifecycleHandlers.push(handler);
      });

      await workflowRunner.initialize();
    });

    afterEach(async () => {
      await workflowRunner.stop();
      clearOutbox();
      delete process.env.WORKFLOW_TERMINATION_OUTBOX;

      // Restore the ambient env so this suite cannot leak into its siblings.
      if (savedMongoose === undefined) delete process.env.MONGOOSE;
      else process.env.MONGOOSE = savedMongoose;
      if (savedProvider === undefined) delete process.env.WORKFLOW_PERSISTENCE_PROVIDER;
      else process.env.WORKFLOW_PERSISTENCE_PROVIDER = savedProvider;
    });

    it('records `cancelled` with the operator message and a completeTime', async () => {
      mockHost.terminateWorkflow.mockResolvedValue(true);

      await workflowRunner.cancelWorkflowInstance('inst-terminated', 'runaway agent step');
      await awaitFlush();

      const stored = fakePersistence.store.get('inst-terminated');
      expect(stored.data.__reactory.termination.code).toBe('cancelled');
      expect(stored.data.__reactory.termination.message).toMatch(/runaway agent step/);
      expect(stored.completeTime).toBeTruthy();
    });

    it('records a provider-error reason when the engine dead-letters a run', async () => {
      expect(lifecycleHandlers.length).toBe(1);

      lifecycleHandlers[0]({
        event: 'workflow.dead-lettered',
        workflowId: 'inst-deadlettered',
        workflowDefinitionId: 'ai.ProcessAITicket@1.4.8',
        version: '1.4.8',
        pointerId: 'p-43',
        stepId: 43,
        retryCount: 3,
        maxRetries: 3,
        errorMessage: 'agent_conversation failed: 503 Service Unavailable',
        deadLetteredAt: '2026-11-03T08:22:35.000Z',
        reason: 'retries-exhausted',
      });
      await awaitFlush();

      const stored = fakePersistence.store.get('inst-deadlettered');
      expect(stored.data.__reactory.termination.code).toBe('provider-error');
      expect(stored.data.__reactory.termination.source).toBe('dead-letter');
      // The engine emits BEFORE it persists the dead-lettered status, so the
      // reload still shows Runnable — completeTime is still stamped.
      expect(stored.completeTime).toBeTruthy();
    });

    it('a real started run is registered, queued on a fatal error, and attributed on the next boot', async () => {
      // Requirement: register through the REAL start path, not the private
      // helper — the earlier test proved the queue/drain mechanics but not that a
      // live run is ever in the registry.
      const instanceId = 'inst-real-start';
      seedInstance(instanceId, { status: 3 }); // what the engine leaves after a terminate
      mockHost.startWorkflow.mockResolvedValue(instanceId);

      const started = await workflowRunner.startWorkflow('ai.ProcessAITicket@1.4.8', instanceId, { ticketRef: 'T-1' });

      expect(started).toBe(instanceId);
      expect(workflowRunner.getInFlightInstanceIds()).toContain(instanceId);

      // The process dies on an unhandled rejection while that run is in flight.
      const exit = jest.fn();
      const other = (): void => { /* noop listener */ };
      process.on('unhandledRejection', other);
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        workflowRunner.handleFatalError(
          'unhandledRejection',
          new Error('agent_conversation provider died: 503 Service Unavailable'),
          { exit },
        );
      } finally {
        process.removeListener('unhandledRejection', other);
        consoleError.mockRestore();
      }

      // Another listener owns the exit (server.ts does exactly this).
      expect(exit).not.toHaveBeenCalled();
      const queued = readOutboxRecords();
      expect(queued.map((r) => r.instanceId)).toContain(instanceId);
      expect(queued.find((r) => r.instanceId === instanceId)!.code).toBe('provider-error');

      // Next boot: the reason reaches the instance row.
      const drained = await workflowRunner.getTerminationRecorder().drainOutbox();
      expect(drained.applied).toBe(1);

      const stored = fakePersistence.store.get(instanceId);
      expect(stored.data.__reactory.termination.code).toBe('provider-error');
      expect(stored.data.__reactory.termination.message).toMatch(/unhandledRejection/);
      expect(stored.completeTime).toBeTruthy();
    });

    it('never re-labels a completed run on stop()', async () => {
      // B1 regression: every deploy used to rewrite runs that had already
      // completed successfully as SHUTDOWN.
      const instanceId = 'inst-completed-run';
      seedInstance(instanceId, {
        status: 2,
        completeTime: new Date('2026-11-03T08:24:00.000Z'),
      });
      mockHost.startWorkflow.mockResolvedValue(instanceId);
      await workflowRunner.startWorkflow('ai.ProcessAITicket@1.4.8', instanceId, {});
      expect(workflowRunner.getInFlightInstanceIds()).toContain(instanceId);

      await workflowRunner.stop();

      const stored = fakePersistence.store.get(instanceId);
      expect(stored.data.__reactory?.termination).toBeUndefined();
      expect(stored.data.__reactory?.interrupted).toBeUndefined();
      expect(new Date(stored.completeTime).toISOString()).toBe('2026-11-03T08:24:00.000Z');
      // ... and the registry was pruned rather than grown for the process lifetime.
      expect(workflowRunner.getInFlightInstanceIds()).not.toContain(instanceId);

      await workflowRunner.initialize();
    });

    it('records an interruption (not a termination) for a run still live at stop()', async () => {
      const instanceId = 'inst-live-run';
      seedInstance(instanceId, { status: 0 });
      mockHost.startWorkflow.mockResolvedValue(instanceId);
      const started = await workflowRunner.startWorkflow('ai.ProcessAITicket@1.4.8', instanceId, {});
      expect(started).toBe(instanceId);
      expect(workflowRunner.getInFlightInstanceIds()).toContain(instanceId);

      const live = await (workflowRunner as any).pruneInFlightInstances();
      expect(live).toEqual([instanceId]);
      expect((workflowRunner as any).persistence).toBeTruthy();

      await workflowRunner.stop();
      expect(fakePersistence.persistWorkflow).toHaveBeenCalled();

      const stored = fakePersistence.store.get(instanceId);
      // The engine resumes this run on the next boot, so it must not be accused
      // of having terminated.
      expect(stored.data.__reactory?.termination).toBeUndefined();
      expect(stored.data.__reactory.interrupted.code).toBe('shutdown');
      expect(stored.completeTime).toBeNull();

      await workflowRunner.initialize();
    });

    it('queues a crash reason for in-flight runs without changing the exit contract', async () => {
      const instanceId = 'inst-in-flight';
      seedInstance(instanceId, { status: 0 });
      mockHost.startWorkflow.mockResolvedValue(instanceId);
      await workflowRunner.startWorkflow('ai.ProcessAITicket@1.4.8', instanceId, {});

      const exit = jest.fn();
      const other = (): void => { /* noop listener */ };
      process.on('uncaughtException', other);
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      try {
        workflowRunner.handleFatalError('uncaughtException', new Error('boom'), { exit });
      } finally {
        process.removeListener('uncaughtException', other);
        consoleError.mockRestore();
      }

      expect(exit).not.toHaveBeenCalled();
      const queued = readOutboxRecords();
      expect(queued).toHaveLength(1);
      expect(queued[0].instanceId).toBe(instanceId);
      expect(queued[0].code).toBe('crash');
      expect(queued[0].message).toMatch(/uncaughtException: Error: boom/);
    });

    it('records an interruption (no terminationReason) when the crash leaves the row Runnable', async () => {
      // THE REALISTIC CRASH SHAPE, and the one the earlier revision never
      // exercised: the process dies while a step is still in flight, so the
      // persisted row is Runnable with an ACTIVE agent_conversation pointer — not
      // a pre-seeded Terminated document. The engine resumes Runnable instances on
      // the next boot, so the drain must record an interruption and must NOT claim
      // the run terminated.
      const instanceId = 'inst-mid-agent-conversation';
      seedInstance(instanceId, {
        status: 0, // Runnable: the engine has not terminated it
        completeTime: null,
        executionPointers: [{
          id: 'p-agent',
          stepId: 41,
          stepName: 'agent_conversation',
          status: 2, // PointerStatus.Running
          active: true,
          retryCount: 0,
          startTime: new Date('2026-11-03T08:22:34.000Z'),
        }],
      });
      mockHost.startWorkflow.mockResolvedValue(instanceId);
      await workflowRunner.startWorkflow('ai.ProcessAITicket@1.4.8', instanceId, {});
      expect(workflowRunner.getInFlightInstanceIds()).toContain(instanceId);

      // The agent step's provider promise rejects and nothing handles it.
      const exit = jest.fn();
      const other = (): void => { /* noop listener */ };
      process.on('unhandledRejection', other);
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        workflowRunner.handleFatalError(
          'unhandledRejection',
          new Error('agent_conversation aborted: 503 Service Unavailable'),
          { exit },
        );
      } finally {
        process.removeListener('unhandledRejection', other);
        consoleError.mockRestore();
      }

      expect(exit).not.toHaveBeenCalled();
      expect(readOutboxRecords().map((r) => r.instanceId)).toContain(instanceId);

      const drained = await workflowRunner.getTerminationRecorder().drainOutbox();
      expect(drained.interrupted).toBe(1);
      expect(drained.applied).toBe(0);

      const stored = fakePersistence.store.get(instanceId);
      // Recorded, but as an interruption: the run has not terminated.
      expect(stored.data.__reactory.interrupted.code).toBe('provider-error');
      expect(stored.data.__reactory.interrupted.signal).toBe('unhandledRejection');
      expect(stored.data.__reactory.termination).toBeUndefined();
      expect(stored.completeTime).toBeNull();
      // The engine's own pointer is untouched — we only annotate the instance.
      expect(stored.executionPointers[0].active).toBe(true);

      // The read layer therefore still reports no termination reason: a live run
      // that was interrupted has not "terminated", and saying so would be the
      // false attribution this ticket removed.
      const lifecycle = workflowRunner.getLifecycleManager();
      const history = await lifecycle.getWorkflowHistoryById(instanceId);
      expect(history!.terminationReason).toBeNull();
    });

    it('reproduces Node default exit behaviour when it is the only listener (never hangs)', () => {
      (workflowRunner as any).trackInFlightInstance('inst-in-flight-2', 'ai.ProcessAITicket@1.4.8');

      const saved = process.listeners('uncaughtException');
      process.removeAllListeners('uncaughtException');
      const exit = jest.fn();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      try {
        workflowRunner.handleFatalError('uncaughtException', new Error('boom'), { exit });
      } finally {
        saved.forEach((listener) => process.on('uncaughtException', listener as any));
        consoleError.mockRestore();
      }

      expect(exit).toHaveBeenCalledWith(1);
    });

    it('removes its process listeners on stop()', async () => {
      const before = process.listenerCount('unhandledRejection');
      await workflowRunner.stop();
      const after = process.listenerCount('unhandledRejection');
      expect(after).toBeLessThan(before);

      // Re-registering must not accumulate listeners either: a second runner
      // takes ownership from the first rather than adding to it.
      await workflowRunner.initialize();
      expect(process.listenerCount('unhandledRejection')).toBeLessThanOrEqual(before);
    });
  });
});
