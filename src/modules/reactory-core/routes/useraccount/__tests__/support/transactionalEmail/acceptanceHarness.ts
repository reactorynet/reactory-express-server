/**
 * Acceptance harness for the transactional-email matrix (E5).
 * ---------------------------------------------------------------------------
 * This file builds the **production collaborator graph** for registration and
 * password-reset email. It exists because this programme has repeatedly shipped
 * green-but-broken and every one of those failures shared one shape: the seam
 * under test was a mock.
 *
 *   supertest -> real UserAccount router
 *     -> real resolveEmailTemplate + real purpose registry
 *       -> real TemplateService (real Mongoose Template model, real collection)
 *         -> real seed data written by the real installDefaultEmailTemplates()
 *       -> real CommunicatorService.send()
 *         -> real MessageService (real Mongoose Message model)
 *         -> real ProviderRegistry
 *         -> real CommunicatorQueueService -> real MessageDispatchWorker
 *           -> real @reactorynet/workflow-es host + real SendMessageWorkflow
 *           -> provider adapter .send()        <-- FAKE (the network edge)
 *     -> real UserService.selfRegister / activateUser (real User model)
 *
 * The only substitution on the delivery path is the provider adapter, exactly
 * as `reactory-communicator/__tests__/acceptance/pipeline.acceptance.test.ts`
 * does. Two further boundaries are bridged because they are I/O the unit pass
 * cannot own, and both are named here rather than hidden:
 *
 *  - **MongoDB.** The suite runs against a real MongoDB, so query semantics,
 *    `strict` mode, unique indexes and `$ne: false` scoping are the real ones.
 *    It is a *disposable* database: `TRANSACTIONAL_EMAIL_MONGO_URI` (default
 *    `mongodb://127.0.0.1:27017/reactory-transactional-email-acceptance`), with
 *    `MONGO_USER` / `MONGO_PASSWORD` for an authenticated local server.
 *  - **the audit log.** `ReactoryAuditService` writes to PostgreSQL; this suite
 *    is Mongo-only, so the audit *sink* is a no-op recorder. Nothing under test
 *    reads it back, and `CommunicatorService.recordAudit()` already treats a
 *    failed audit write as non-fatal.
 *
 * Everything else is production code with no interception. `templateService`
 * and `communicatorService` are wrapped in **call-through** spies (`jest.spyOn`
 * with no implementation) purely so the tests can see which view was resolved
 * and what the route asked the sender to send; the production method still runs.
 */

import express from 'express';
import mongoose from 'mongoose';

import { configureWorkflow, MemoryPersistenceProvider } from '@reactorynet/workflow-es';
import { InMemoryQueueService } from '@reactory/server-modules/reactory-queue/services/queue/InMemoryQueueService';

import { CommunicatorTemplateModel } from '@reactory/server-modules/reactory-communicator/models/Template';
import Message from '@reactory/server-modules/reactory-communicator/models/Message';
import { installDefaultEmailTemplates } from '@reactory/server-modules/reactory-communicator/seeding/installDefaultEmailTemplates';
import { TemplateService } from '@reactory/server-modules/reactory-communicator/services/TemplateService';
import { MessageService } from '@reactory/server-modules/reactory-communicator/services/MessageService';
import { CommunicatorService } from '@reactory/server-modules/reactory-communicator/services/CommunicatorService';
import { ProviderRegistry } from '@reactory/server-modules/reactory-communicator/services/ProviderRegistry';
import CommunicatorQueueService from '@reactory/server-modules/reactory-communicator/services/CommunicatorQueueService';
import MessageDispatchWorker from '@reactory/server-modules/reactory-communicator/services/MessageDispatchWorker';
import {
  setWorkflowContext,
  clearWorkflowContext,
} from '@reactory/server-modules/reactory-communicator/services/workflowContext';
import { SendMessageWorkflow } from '@reactory/server-modules/reactory-communicator/workflows/SendMessageWorkflow';
import { Channel, QueueType } from '@reactory/server-modules/reactory-communicator/types';

import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import User from '@reactory/server-modules/reactory-core/models/User';
import UserService from '@reactory/server-modules/reactory-core/services/UserService';

import UserAccountRouter from '../../../UserAccount';

/* ------------------------------------------------------------------------- */
/* Datastore                                                                  */
/* ------------------------------------------------------------------------- */

/** Database this suite owns. Never the development database. */
export const ACCEPTANCE_MONGO_URI =
  process.env.TRANSACTIONAL_EMAIL_MONGO_URI?.trim() ||
  'mongodb://127.0.0.1:27017/reactory-transactional-email-acceptance';

/** The application key every document in this suite is scoped to. */
export const ACCEPTANCE_APPLICATION_KEY = 'transactional-email-acceptance';

/** Suffix on every recipient this suite creates, so cleanup is exact. */
export const ACCEPTANCE_EMAIL_DOMAIN = 'acceptance.transactional.test';

/**
 * Refuse to run against a production process.
 *
 * The suite writes and deletes documents. `NODE_ENV` is forced to `test` by
 * `test/setup/testEnvironment.ts`, so the pre-Jest value is carried in
 * `TRANSACTIONAL_EMAIL_ACCEPTANCE_NODE_ENV` by whoever launches the run.
 */
const assertNotProduction = (): void => {
  const nodeEnv = process.env.TRANSACTIONAL_EMAIL_ACCEPTANCE_NODE_ENV ?? process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    throw new Error(
      'Refusing to run the transactional email acceptance suite under NODE_ENV=production: it creates and deletes documents.',
    );
  }
};

export const connect = async (): Promise<void> => {
  assertNotProduction();

  if (mongoose.connection.readyState !== 0) return;

  const uri = ACCEPTANCE_MONGO_URI;
  const options: Record<string, any> = { serverSelectionTimeoutMS: 10_000 };

  // Only when the URI carries no credentials of its own: state them separately
  // so the value never has to appear in a URI, a log line or a test name.
  const embeddedCredentials = /\/\/[^/@]+@/.test(uri);
  const user = process.env.MONGO_USER;
  const pass = process.env.MONGO_PASSWORD;
  if (!embeddedCredentials && user && pass) {
    options.user = user;
    options.pass = pass;
    options.authSource = process.env.MONGO_AUTH_SOURCE ?? 'admin';
  }

  await mongoose.connect(uri, options);
};

export const disconnect = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
};

/* ------------------------------------------------------------------------- */
/* Provider adapter (the only fake on the delivery path)                      */
/* ------------------------------------------------------------------------- */

export interface IAdapterCall {
  payload: any;
  at: Date;
}

export interface IAcceptanceAdapter {
  id: string;
  name: string;
  type: string;
  channels: Channel[];
  priority: number;
  initialize: () => Promise<boolean>;
  send: (payload: any) => Promise<any>;
  sendBatch: () => Promise<any>;
  healthCheck: () => Promise<any>;
  getCapabilities: () => any;
  getStatus: () => string;
  /** Every `send()` invocation, in order. */
  calls: IAdapterCall[];
  /** Make the next send resolve `{ success: false }` (provider rejection). */
  failNextSend(reason: string): void;
}

export const createAcceptanceAdapter = (providerId: string): IAcceptanceAdapter => {
  const calls: IAdapterCall[] = [];
  let pendingFailure: string | undefined;
  let sequence = 0;

  return {
    id: providerId,
    name: 'Transactional email acceptance adapter',
    type: 'email',
    channels: [Channel.EMAIL],
    priority: 1,
    calls,
    async initialize() {
      return true;
    },
    async send(payload: any) {
      calls.push({ payload, at: new Date() });
      if (pendingFailure) {
        const error = pendingFailure;
        pendingFailure = undefined;
        return { success: false, error, timestamp: new Date() };
      }
      sequence += 1;
      return {
        success: true,
        providerMessageId: `${providerId}-${sequence}`,
        metadata: { acceptance: true },
        timestamp: new Date(),
      };
    },
    async sendBatch() {
      return { total: 0, successful: 0, failed: 0, results: [], timestamp: new Date() };
    },
    async healthCheck() {
      return { success: true, responseTime: 1, message: 'Healthy', timestamp: new Date() };
    },
    getCapabilities() {
      return {
        maxMessageLength: 10_000,
        supportsAttachments: false,
        supportsHtml: true,
        supportsBatch: false,
        maxBatchSize: 1,
        rateLimit: { requestsPerSecond: 100, requestsPerHour: 100_000 },
      };
    },
    getStatus() {
      return 'healthy';
    },
    failNextSend(reason: string) {
      pendingFailure = reason;
    },
  };
};

/* ------------------------------------------------------------------------- */
/* Harness                                                                    */
/* ------------------------------------------------------------------------- */

const WORKER_OPTIONS = {
  enabled: true,
  batchSize: 10,
  // Driven by explicit tick() calls; the intervals must never fire on their own.
  pollIntervalMs: 3_600_000,
  queueIntervals: {
    [QueueType.PRIMARY]: 3_600_000,
    [QueueType.RETRY]: 3_600_000,
    [QueueType.SCHEDULED]: 3_600_000,
    [QueueType.DLQ]: 3_600_000,
  },
  shutdownTimeoutMs: 1_000,
  recoveryBatchSize: 100,
  recoveryStaleMs: 60_000,
};

const TERMINAL_WORKFLOW_STATUSES = [2, 3]; // Complete, Terminated
const WORKFLOW_TIMEOUT_MS = 15_000;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const silentLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  log: () => undefined,
};

/** One template definition, in the shape the real seeder consumes. */
export interface ITemplateFixture {
  view: string;
  subject: string;
  html: string;
  name?: string;
}

export interface ITransactionalEmailHarness {
  readonly app: express.Express;
  /** Real `ReactoryClient` document. `getSetting()` is the production method. */
  readonly partner: any;
  readonly partnerId: string;
  readonly templateService: any;
  readonly messageService: any;
  readonly communicatorService: any;
  readonly userService: any;
  readonly registry: ProviderRegistry;
  readonly adapter: IAcceptanceAdapter;
  readonly queueService: any;
  readonly worker: any;
  readonly context: any;
  /** Views handed to the real `TemplateService.resolveTemplate()`, in order. */
  readonly resolvedViews: string[];
  /** Payloads handed to the real `CommunicatorService.send()`, in order. */
  readonly sendRequests: any[];
  /** Insert one extra template (parent + subject/body elements) for this app. */
  installTemplate(fixture: ITemplateFixture): Promise<void>;
  /** Write (or replace) an application setting on the real partner document. */
  setSetting(name: string, data: unknown): Promise<void>;
  /** Remove an application setting. */
  clearSetting(name: string): Promise<void>;
  /** Restore the partner document to "no email settings at all". */
  clearEmailSettings(): Promise<void>;
  /** Run one dispatch worker cycle on the primary lane. */
  dispatch(): Promise<any>;
  /** Adapter invocations recorded so far. */
  adapterCalls(): IAdapterCall[];
  /** Drop recorded adapter calls and send requests (not the persisted rows). */
  resetObservations(): void;
  /** Message count for this application. */
  messageCount(): Promise<number>;
  /** Delete persisted messages for this application (fixture isolation). */
  clearMessages(): Promise<void>;
  /** Remove everything this suite wrote. */
  teardown(): Promise<void>;
}

const buildDefinition = (view: string, subject: string, body: string, name?: string) => ({
  view,
  name: name || view,
  description: `Acceptance fixture template ${view}`,
  kind: 'email' as const,
  format: 'html' as const,
  channel: 'email' as const,
  enabled: true,
  elements: [
    {
      view: `${view}/subject`,
      role: 'subject' as const,
      kind: 'email' as const,
      format: 'text' as const,
      name: `${view} subject`,
      description: `Subject for ${view}`,
      content: subject,
    },
    {
      view: `${view}/body`,
      role: 'body' as const,
      kind: 'email' as const,
      format: 'html' as const,
      name: `${view} body`,
      description: `Body for ${view}`,
      content: body,
    },
  ],
});

export const createHarness = async (): Promise<ITransactionalEmailHarness> => {
  await connect();

  // This database belongs to the suite; start from a clean one so a previous
  // aborted run cannot make an assertion pass.
  await mongoose.connection.db.dropDatabase();

  /* --- the application --------------------------------------------------- */

  const partner: any = await ReactoryClient.create({
    key: ACCEPTANCE_APPLICATION_KEY,
    name: 'Acceptance Application',
    siteUrl: 'https://acceptance.example.com',
    resetEmailRoute: '/forgot-password',
  });
  const partnerId = String(partner._id);

  /* --- the real seed data ------------------------------------------------ */

  // The production seeder, not a hand-written fixture: this is the same code
  // path a boot runs, writing `activation-email` and `forgot-password-email`
  // into the canonical `communicatortemplates` collection for this client.
  await installDefaultEmailTemplates(CommunicatorTemplateModel as any, {
    clientIds: [partner._id],
  });

  /* --- the real services ------------------------------------------------- */

  const services: Record<string, any> = {};

  const context: any = {
    user: null,
    partner,
    logger: silentLogger,
    req: undefined,
    sessionId: undefined,
    getValue: async () => undefined,
    setValue: async () => undefined,
    removeValue: async () => undefined,
    getService: (id: string) => services[id] ?? null,
    telemetry: {
      createCounter: () => ({ add: () => undefined }),
      createHistogram: () => ({ record: () => undefined }),
      increment: () => undefined,
    },
    log: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const userService: any = new UserService({} as any, context);
  services['core.UserService@1.0.0'] = userService;

  const templateService: any = new TemplateService({} as any, context);
  templateService.logger = silentLogger;
  await templateService.initialize(context);
  services['communicator.TemplateService@1.0.0'] = templateService;

  const messageService: any = new MessageService({} as any, context);
  // Postgres-backed in production; a no-op sink here (see the file header).
  messageService.auditService = { logAuditEvent: async () => undefined };
  services['communicator.MessageService@1.0.0'] = messageService;

  /* --- the real queue, engine, worker and provider registry --------------- */

  const queueProvider = new InMemoryQueueService({}, {} as any);
  const persistence = new MemoryPersistenceProvider();
  const config = configureWorkflow();
  config.usePersistence(persistence);
  config.allowSingleNodeProviders(true);
  const host: any = config.getHost();
  host.registerWorkflow(SendMessageWorkflow as any);
  await host.start();

  const waitForWorkflow = async (instanceId: string): Promise<void> => {
    const started = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const instance: any = await persistence.getWorkflowInstance(instanceId);
      if (instance && TERMINAL_WORKFLOW_STATUSES.includes(instance.status as any)) {
        if (instance.status === 3) {
          throw new Error(
            `Workflow ${instanceId} TERMINATED instead of completing: ${JSON.stringify(
              instance.error ?? instance.output ?? '(no error recorded)',
            )}`,
          );
        }
        return;
      }
      if (Date.now() - started > WORKFLOW_TIMEOUT_MS) {
        throw new Error(
          `Workflow ${instanceId} did not reach a terminal state within ${WORKFLOW_TIMEOUT_MS}ms`,
        );
      }
      await wait(15);
    }
  };

  services['reactory.QueueProvider@1.0.0'] = {
    getProvider: () => queueProvider,
    getDefaultProvider: () => queueProvider,
  };
  services['core.ReactoryWorkflowService@1.0.0'] = {
    startWorkflow: async (workflowId: string, executionInput: any) => {
      const instanceId: string = await host.startWorkflow(workflowId, '1.0.0', executionInput);
      await waitForWorkflow(instanceId);
      return { id: instanceId };
    },
  };

  const registry = new ProviderRegistry({} as any, context);
  await registry.initialize(context);
  const adapter = createAcceptanceAdapter('acceptance-email');
  registry.registerProvider(adapter as any);
  services['communicator.ProviderRegistry@1.0.0'] = registry;

  const queueService: any = new CommunicatorQueueService(
    { retry: { random: () => 0.5, baseDelayMs: 0, maxDelayMs: 0 } },
    context,
  );
  queueService.logger = context;
  await queueService.initialize();
  services['communicator.CommunicatorQueueService@1.0.0'] = queueService;

  setWorkflowContext(context);

  const worker: any = new MessageDispatchWorker({ options: WORKER_OPTIONS }, context);
  worker.setQueueService(queueService);
  await worker.initialize();

  const communicatorService: any = new CommunicatorService({} as any, context);
  await communicatorService.initialize(context);
  services['communicator.CommunicatorService@1.0.0'] = communicatorService;

  /* --- call-through observation ------------------------------------------ */

  const resolvedViews: string[] = [];
  const sendRequests: any[] = [];

  // Observation only: the production method still runs, it is just recorded.
  // The original is captured *before* the spy is installed so there is no
  // chance of the replacement calling itself.
  const originalResolveTemplate = templateService.resolveTemplate.bind(templateService);
  jest.spyOn(templateService, 'resolveTemplate').mockImplementation((ref: string, scope?: any) => {
    resolvedViews.push(ref);
    return originalResolveTemplate(ref, scope);
  });

  const originalSend = communicatorService.send.bind(communicatorService);
  jest.spyOn(communicatorService, 'send').mockImplementation((payload: any) => {
    sendRequests.push(payload);
    return originalSend(payload);
  });

  /* --- the HTTP surface --------------------------------------------------- */

  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.partner = partner;
    req.context = context;
    next();
  });
  app.use('/useraccount', UserAccountRouter);

  /* --- helpers ------------------------------------------------------------ */

  const setSetting = async (name: string, data: unknown): Promise<void> => {
    const settings: any[] = Array.isArray(partner.settings) ? partner.settings : [];
    const existing = settings.find((entry: any) => entry.name === name);
    if (existing) {
      existing.data = data;
    } else {
      settings.push({ name, data, settingType: 'generic', variant: 'default' });
    }
    partner.settings = settings;
    partner.markModified('settings');
    await partner.save();
  };

  const clearSetting = async (name: string): Promise<void> => {
    partner.settings = (partner.settings || []).filter((entry: any) => entry.name !== name);
    partner.markModified('settings');
    await partner.save();
  };

  return {
    app,
    partner,
    partnerId,
    templateService,
    messageService,
    communicatorService,
    userService,
    registry,
    adapter,
    queueService,
    worker,
    context,
    resolvedViews,
    sendRequests,
    async installTemplate(fixture: ITemplateFixture) {
      await installDefaultEmailTemplates(CommunicatorTemplateModel as any, {
        clientIds: [partner._id],
        definitions: [
          buildDefinition(fixture.view, fixture.subject, fixture.html, fixture.name) as any,
        ],
      });
    },
    setSetting,
    clearSetting,
    async clearEmailSettings() {
      partner.settings = (partner.settings || []).filter(
        (entry: any) => !String(entry.name || '').startsWith('email_template_'),
      );
      partner.markModified('settings');
      await partner.save();
    },
    async dispatch() {
      return worker.tick(QueueType.PRIMARY);
    },
    adapterCalls() {
      return adapter.calls;
    },
    resetObservations() {
      adapter.calls.length = 0;
      sendRequests.length = 0;
      resolvedViews.length = 0;
    },
    async messageCount() {
      return Message.countDocuments({ partnerId });
    },
    async clearMessages() {
      await Message.deleteMany({ partnerId } as any);
    },
    async teardown() {
      await worker.onShutdown().catch(() => undefined);
      clearWorkflowContext();
      if (host) await host.stop().catch(() => undefined);

      // Explicit, tenant-scoped cleanup. Never a collection drop.
      await Message.deleteMany({ partnerId } as any).catch(() => undefined);
      await CommunicatorTemplateModel.deleteMany({ client: partner._id } as any).catch(
        () => undefined,
      );
      await User.deleteMany({
        email: { $regex: `@${ACCEPTANCE_EMAIL_DOMAIN.replace(/\./g, '\\.')}$` },
      } as any).catch(() => undefined);
      await ReactoryClient.deleteOne({ key: ACCEPTANCE_APPLICATION_KEY } as any).catch(
        () => undefined,
      );
    },
  };
};

/* ------------------------------------------------------------------------- */
/* Assertion helpers used by the suite                                       */
/* ------------------------------------------------------------------------- */

/**
 * Pull the first URL out of rendered HTML.
 *
 * Used to prove the interpolated `resetLink` / `activationLink` actually
 * reached the message a provider would send - not merely that the payload
 * carried it.
 */
export const firstLinkIn = (html: string): string | undefined => {
  const match = /href="([^"]+)"/.exec(html || '');
  return match ? match[1] : undefined;
};
