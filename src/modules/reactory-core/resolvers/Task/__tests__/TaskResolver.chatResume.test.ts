/**
 * REACTORY-302016408/20261108/843104560 — TaskResolver chat resume/intake rejections.
 *
 * `completeWorkflowTask` resumes a Reactor Chat tool execution (approval) or
 * interrupts it (decline) on a fire-and-forget basis: the approver's task
 * acknowledgement must not block on a long agent turn. What these tests pin is
 * that neither call can produce an UNHANDLED rejection — `src/express/server.ts`
 * turns one into `process.exit(0)` — that a failing resume never fails the
 * approval itself, and that the "Resumed chat session" log cannot report success
 * before the resume has actually resolved.
 *
 * NOTE ON SETTLING: the resume promise is deliberately not awaited by the
 * resolver, so every assertion on the log/error handler runs only AFTER
 * `settle()` has drained the microtask queue. Without that the handlers have not
 * run yet and the assertions pass vacuously — exactly the class of false green
 * this ticket exists to remove.
 */
import { ObjectId } from 'mongodb';
import TaskResolver from '../TaskResolver';
import TaskModel from '../../../models/Task';
import { TASK_COMPLETED_EVENT } from '../../../workflow/YamlFlow/steps/core/UserActivityStep';

jest.mock('../../../models/Task', () => {
  const model: any = jest.fn();
  model.findById = jest.fn();
  return { __esModule: true, default: model };
});

const CHAT_SESSION_ID = '6aeffbcf57068bf71a20adef';
const PERSONA_ID = 'persona-1';
const TENANT_ID = 'tenant-1';
const TASK_ID = new ObjectId();
const APPROVER_EMAIL = 'approver@reactory.net';

/** Drains microtasks AND one macrotask turn, so fire-and-forget handlers ran. */
const settle = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const createTask = (overrides: Record<string, any> = {}) => ({
  _id: TASK_ID,
  instanceId: 'instance-1',
  stepId: 'approval-step',
  user: new ObjectId(),
  // maxIterations present so the approval branch computes a concrete newMax (15).
  componentProps: {
    chatSessionId: CHAT_SESSION_ID,
    personaId: PERSONA_ID,
    maxIterations: 5,
  },
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createWorkflowService = () => ({
  getWorkflowHistoryById: jest.fn().mockResolvedValue({ tenantId: TENANT_ID }),
  publishWorkflowEvent: jest.fn().mockResolvedValue({ success: true }),
  signalWorkflowInstance: jest.fn().mockResolvedValue({ success: true }),
});

const createConversationService = () => ({
  continueToolExecution: jest.fn().mockResolvedValue(undefined),
  interruptToolExecution: jest.fn().mockResolvedValue(undefined),
});

const createContext = (conversationService: any, workflowService: any) => ({
  user: { _id: new ObjectId(), email: APPROVER_EMAIL },
  hasRole: jest.fn(() => true),
  hasAnyRole: jest.fn(() => true),
  log: jest.fn(),
  getService: jest.fn((serviceId: string) => {
    if (serviceId === 'core.ReactoryWorkflowService@1.0.0') return workflowService;
    if (serviceId === 'reactor.ReactorConversationService@1.0.0') return conversationService;
    return null;
  }),
});

/**
 * Mirrors `MergeGraphResolvers`/delegateTo: the resolver map lives on the class
 * prototype and every entry runs detached from the class instance.
 */
const invokeCompleteWorkflowTask = (context: any, resultData: any) => {
  const instance: any = Object.create((TaskResolver as any).prototype);
  const entry = instance.resolver.Mutation.completeWorkflowTask;
  return entry(null, { taskId: TASK_ID.toString(), resultData }, context, {});
};

const findLog = (context: any, pattern: RegExp): any[] | undefined =>
  context.log.mock.calls.find((call: any[]) => pattern.test(String(call[0])));

const stubTaskLookup = (task: any) => {
  (TaskModel as any).findById.mockReturnValue({
    exec: jest.fn().mockResolvedValue(task),
  });
};

describe('TaskResolver.completeWorkflowTask — chat resume/interrupt rejections', () => {
  let task: any;
  let conversationService: any;
  let workflowService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    task = createTask();
    stubTaskLookup(task);
    workflowService = createWorkflowService();
    conversationService = createConversationService();
  });

  it('approval: a rejected continueToolExecution does not escape and does not fail the approval', async () => {
    conversationService.continueToolExecution.mockRejectedValue(new Error('provider exploded'));
    const context: any = createContext(conversationService, workflowService);

    const result = await invokeCompleteWorkflowTask(context, { approved: true });

    // The approval must never fail because the resume did.
    expect(result).toEqual(expect.objectContaining({ success: true }));

    await settle();

    expect(conversationService.continueToolExecution).toHaveBeenCalledWith(CHAT_SESSION_ID, PERSONA_ID, 15);
    const failure = findLog(context, /^Could not resume chat session/);
    expect(failure).toBeDefined();
    expect(failure![0]).toBe(
      `Could not resume chat session ${CHAT_SESSION_ID} after approval: provider exploded`,
    );
    expect(failure![2]).toBe('error');
    expect(failure![3]).toBe('TaskResolver');
  });

  it('decline: a rejected interruptToolExecution does not escape and does not fail the decline', async () => {
    conversationService.interruptToolExecution.mockRejectedValue(new Error('session gone'));
    const context: any = createContext(conversationService, workflowService);

    const result = await invokeCompleteWorkflowTask(context, { approved: false, reason: 'Declined by user' });

    expect(result).toEqual(expect.objectContaining({ success: true }));

    await settle();

    expect(conversationService.interruptToolExecution).toHaveBeenCalledWith(
      CHAT_SESSION_ID,
      PERSONA_ID,
      'Declined by user',
    );
    const failure = findLog(context, /^Could not interrupt chat session/);
    expect(failure).toBeDefined();
    expect(failure![0]).toBe(
      `Could not interrupt chat session ${CHAT_SESSION_ID} after decline: session gone`,
    );
    expect(failure![2]).toBe('error');
    expect(failure![3]).toBe('TaskResolver');
    expect(findLog(context, /^Interrupted chat session/)).toBeUndefined();
  });

  it('logs "Resumed chat session" only when the resume actually resolved', async () => {
    const context: any = createContext(conversationService, workflowService);

    const approved = await invokeCompleteWorkflowTask(context, { approved: true });
    expect(approved.success).toBe(true);
    await settle();

    const resumed = findLog(context, /^Resumed chat session/);
    expect(resumed).toBeDefined();
    expect(resumed![0]).toBe(`Resumed chat session ${CHAT_SESSION_ID} after task approval`);
    expect(resumed![2]).toBe('info');
    expect(findLog(context, /^Could not resume chat session/)).toBeUndefined();

    // Same call, but the resume rejects: the success line must be absent.
    conversationService.continueToolExecution.mockRejectedValueOnce(new Error('nope'));
    const rejectedContext: any = createContext(conversationService, workflowService);

    await invokeCompleteWorkflowTask(rejectedContext, { approved: true });
    await settle();

    expect(findLog(rejectedContext, /^Resumed chat session/)).toBeUndefined();
    expect(findLog(rejectedContext, /^Could not resume chat session/)).toBeDefined();
  });

  it('logs "Interrupted chat session" only when the interrupt actually resolved', async () => {
    const context: any = createContext(conversationService, workflowService);

    await invokeCompleteWorkflowTask(context, { approved: false });
    await settle();

    const interrupted = findLog(context, /^Interrupted chat session/);
    expect(interrupted).toBeDefined();
    expect(interrupted![0]).toBe(`Interrupted chat session ${CHAT_SESSION_ID} after task decline`);
    expect(interrupted![2]).toBe('info');
  });

  it('does not log "Resumed chat session" before the resume resolves', async () => {
    let releaseResume: (() => void) | undefined;
    conversationService.continueToolExecution.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseResume = resolve;
        }),
    );
    const context: any = createContext(conversationService, workflowService);

    const result = await invokeCompleteWorkflowTask(context, { approved: true });
    expect(result.success).toBe(true);

    // The resolver has returned; the resume is still in flight. Nothing may claim success.
    await settle();
    expect(findLog(context, /^Resumed chat session/)).toBeUndefined();

    releaseResume!();
    await settle();
    expect(findLog(context, /^Resumed chat session/)).toBeDefined();
  });

  it('produces no process-level unhandledRejection when the resume rejects', async () => {
    conversationService.continueToolExecution.mockRejectedValue(new Error('provider exploded'));
    const context: any = createContext(conversationService, workflowService);

    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    try {
      const result = await invokeCompleteWorkflowTask(context, { approved: true });
      await settle();

      expect(result.success).toBe(true);
      // This is the assertion that actually pins the API outage: with a bare
      // `void promise` this listener fires and server.ts calls process.exit(0).
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.removeListener('unhandledRejection', unhandled);
    }
  });

  it('produces no process-level unhandledRejection when the interrupt rejects', async () => {
    conversationService.interruptToolExecution.mockRejectedValue(new Error('session gone'));
    const context: any = createContext(conversationService, workflowService);

    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    try {
      await invokeCompleteWorkflowTask(context, { approved: false });
      await settle();

      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.removeListener('unhandledRejection', unhandled);
    }
  });

  it('still publishes the workflow event and returns success when the resume rejects', async () => {
    conversationService.continueToolExecution.mockRejectedValue(new Error('provider exploded'));
    const context: any = createContext(conversationService, workflowService);

    const result = await invokeCompleteWorkflowTask(context, { approved: true });
    await settle();

    expect(result.success).toBe(true);
    expect(workflowService.publishWorkflowEvent).toHaveBeenCalledTimes(1);
    expect(workflowService.publishWorkflowEvent).toHaveBeenCalledWith(
      TASK_COMPLETED_EVENT,
      TASK_ID.toString(),
      expect.objectContaining({
        approved: true,
        completedByEmail: APPROVER_EMAIL,
        taskId: TASK_ID.toString(),
      }),
      TENANT_ID,
    );
    expect(result.signalResult).toEqual({ success: true });
    // The task document itself was still completed.
    expect(task.status).toBe('completed');
    expect(task.percentComplete).toBe(100);
  });
});
