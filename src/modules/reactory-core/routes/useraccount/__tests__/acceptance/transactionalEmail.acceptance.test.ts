/**
 * E5 - acceptance matrix for templated transactional email.
 * ---------------------------------------------------------------------------
 * The programme's definition of done: registration and password reset both
 * deliver a *templated* email, each application can override the template, the
 * fallback chain works, and the failure modes behave distinctly.
 *
 * This suite exists because the codebase has repeatedly shipped green-but-broken
 * on exactly these flows: `SendMessageWorkflow` never executed on the real engine
 * while its tests passed, `CommunicatorService` ran with four null collaborators
 * behind 95 fake-injecting tests, and `render()` mocked a return shape the real
 * implementation never produced. Each of those was a *seam* that a double hid.
 *
 * So the seam here is real:
 *
 *   supertest -> real UserAccount router -> real purpose resolver
 *     -> real TemplateService against a real MongoDB collection seeded by the
 *        real `installDefaultEmailTemplates()`
 *     -> real CommunicatorService (real `validateVariables` + real
 *        `renderMessage` + real subject precedence)
 *     -> real MessageService / ProviderRegistry / queue / dispatch worker /
 *        workflow engine
 *     -> provider adapter  <-- the ONLY fake (the network edge)
 *
 * Two layers are recorded per scenario, because the production send path is
 * currently blocked between them by a defect this suite found (see below):
 *
 *   - **template + render layer** - executed. What the route resolved, and what
 *     the production `CommunicatorService.renderTemplate()` produced from the
 *     route's own payload: subject, html, text and the interpolated link.
 *   - **delivery layer** - the same message persisted, dispatched and received
 *     by the provider adapter, asserted on rendered content.
 *
 * ===========================================================================
 * STATUS: BLOCKED - the delivery layer cannot execute (defect D1)
 * ===========================================================================
 * `communicator.MessageService.createMessage()` never assigns the business `id`
 * the `Message` schema requires, so `Message.create()` fails validation with
 *
 *     id: Path `id` is required.
 *
 * which surfaces as `MESSAGE_CREATE_FAILED` and means no templated send can be
 * persisted, queued or dispatched - for any channel, on any surface. It is a
 * pre-existing defect in the communicator module (a separate repository, and a
 * production write path for every sender), so it is reported rather than fixed
 * here. The guard in "D1 guard" below proves it; the moment the defect is fixed
 * the guard fails with an instruction to flip DELIVERY_ENABLED.
 *
 * Tracked reference (N5). The defect is pinned to a commit, not just described:
 *
 *   repository  reactorynet/reactory-communicator
 *   revision    03da474  (HEAD of master when this suite was written)
 *   schema      src/modules/Message.ts:22-27   `id: { type: String, required: true,
 *                                              unique: true, index: true }`
 *   defect      src/modules/MessageService.ts:68-72  createMessage() spreads the
 *               caller's data and calls messageModel.create() without ever
 *               assigning `id`
 *   message     Message validation failed: CommunicatorMessage validation failed:
 *               id: Path `id` is required.
 *
 * Because of D1 this ticket is BLOCKED, not done: a green suite full of honest
 * skips is not a satisfied acceptance criterion. See
 * docs/verification/TRANSACTIONAL_EMAIL_MATRIX.md sections 4.3-4.4.
 *
 * Why the fix is not in this commit: `src/modules/reactory-communicator` is a
 * SEPARATE git repository (git@github.com:reactorynet/reactory-communicator)
 * that express-server does not track at all (`git ls-files` there returns
 * nothing). Committing DELIVERY_ENABLED = true against a fix that lives only in
 * an unmerged cross-repo change would commit a suite that is red on every clean
 * checkout. The unblock order is: communicator PR -> flip the flag -> republish
 * the matrix with observed delivery rows.
 *
 * Guard behaviour, stated the way the code actually behaves (corrected twice in
 * review). D1 is detected ONCE in beforeAll by probing the production call, and
 * an UNCONDITIONAL `describe('D1 guard ...')` compares that OBSERVED state with
 * DELIVERY_ENABLED. On disagreement it throws an instruction naming the flag to
 * change: `fixedButFlagOff` when the fix landed without the flag, and
 * `flagOnButStillBlocked` when the flag was flipped too early. It does not rely
 * on some later assertion failing.
 *
 * The block is deliberately NOT behind `blockerDescribe`: an earlier revision put
 * it there, and because that helper is `describe.skip` exactly when the flag is
 * true, the reverse-disagreement branch became unreachable dead code - both guard
 * tests printed "skipped" while six delivery tests failed with no instruction.
 * The two DIAGNOSTIC tests stay behind it, since they are the evidence for the
 * skip and are meaningless once the delivery layer runs.
 *
 * Every evidence row carries the HTTP status the test actually observed, read
 * from the response object the assertions ran on.
 *
 * Run:
 *   TRANSACTIONAL_EMAIL_MONGO_URI=mongodb://127.0.0.1:27017/reactory-transactional-email-acceptance \
 *     npx jest --config jest.integration.config.ts --runInBand --forceExit \
 *     --testPathPattern "useraccount/__tests__/acceptance/transactionalEmail"
 *
 * This suite needs a live MongoDB, so it is listed in `test/integrationSuites.js`
 * and runs from `jest.integration.config.ts`, never in the unit pass.
 */

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import request from 'supertest';
import moment from 'moment';

import logger from '@reactory/server-core/logging';
import { CommunicatorTemplateModel } from '@reactory/server-modules/reactory-communicator/models/Template';

import User from '@reactory/server-modules/reactory-core/models/User';

import {
  PASSWORD_RESET_ACKNOWLEDGEMENT,
  passwordResetFallbackSubject,
  registrationFallbackSubject,
  createActivationToken,
  ACTIVATION_MESSAGES,
} from '../../UserAccount';

import {
  ACCEPTANCE_EMAIL_DOMAIN,
  ITransactionalEmailHarness,
  createHarness,
  disconnect,
  firstLinkIn,
} from '../support/transactionalEmail/acceptanceHarness';

jest.setTimeout(180_000);

const mockLogger = logger as any;

/**
 * Flip to `true` once defect D1 is fixed.
 *
 * This flag decides only ONE thing: whether the seven delivery-layer tests run.
 * It is NOT used to decide what to assert about D1's presence - that is observed
 * at runtime by probeBlocker(), because deriving it from this flag is how the
 * suite previously produced seven misleading 500-vs-200 failures instead of one
 * instruction when the upstream fix landed without the flag being flipped.
 *
 * When the flag and reality disagree, the coherence guard in
 * `describe('D1 guard ...')` fails with an instruction and nothing else does.
 */
const DELIVERY_ENABLED = true;

const deliveryIt = DELIVERY_ENABLED ? it : it.skip;

/**
 * Whether defect D1 is still present, OBSERVED - not assumed.
 *
 * Probed once in beforeAll through the real MessageService.createMessage()
 * against the real Message schema, i.e. exactly the call the send path makes.
 * `null` means the probe has not run.
 *
 * Everything that depends on D1's presence reads this instead of
 * DELIVERY_ENABLED, so the suite cannot assert a 500 in a world that answers 200
 * (or the reverse): it reports the actual state and, if that state disagrees
 * with the flag, says so once and clearly.
 */
let blockerPresent: boolean | null = null;

/** The observed failure while the blocker is present, kept as guard evidence. */
let blockerFailure: any = null;

/**
 * The status `/forgot` answers with, as observed.
 *
 * 500 while D1 is present (the send cannot persist a message); 200 once it is
 * fixed. Previously a constant derived from DELIVERY_ENABLED, which is what made
 * a fixed-but-not-flipped world fail in seven places with unhelpful messages.
 */
const resetStatus = (): number => (blockerPresent === false ? 200 : 500);

/** The exact call the send path makes, used only to detect D1. */
const BLOCKER_PROBE = {
  partnerId: 'd1-probe',
  userId: 'd1-probe',
  channel: 'email',
  to: 'd1-probe@acceptance.transactional.test',
  subject: 'd1 probe',
  content: { subject: 'd1 probe', text: 'body', html: '<p>body</p>' },
};

/** What to do about each disagreement between the flag and reality. */
const INSTRUCTION = {
  fixedButFlagOff:
    'The message-persistence blocker (D1) is FIXED: MessageService.createMessage() now persists a ' +
    'message. Flip DELIVERY_ENABLED to true at the top of ' +
    'transactionalEmail.acceptance.test.ts so the seven delivery-layer tests run, then republish ' +
    'docs/verification/TRANSACTIONAL_EMAIL_MATRIX.md section 3.2 with the observed rows.',
  flagOnButStillBlocked:
    'DELIVERY_ENABLED is true but defect D1 is still present: MessageService.createMessage() cannot ' +
    'persist a message, so the seven delivery-layer tests cannot pass. Either land the communicator PR ' +
    '(assign the business id in MessageService.createMessage, plus a real-model test) or set ' +
    'DELIVERY_ENABLED = false and keep E5 BLOCKED.',
};

/**
 * Detect whether D1 is present, through the production call.
 *
 * Deliberately the same call the send path makes - no mock, no schema
 * introspection - so the answer cannot drift from what the route experiences.
 */
const probeBlocker = async (): Promise<void> => {
  try {
    const created: any = await harness.messageService.createMessage({ ...BLOCKER_PROBE });
    blockerPresent = false;
    blockerFailure = null;
    // A successful probe wrote a row under BLOCKER_PROBE.partnerId, which is NOT
    // the acceptance application's partnerId. Deleting with the default filter
    // could never match it (N8), so the probe's own id is passed explicitly. If the
    // delete fails the row is reported rather than left to colour messageCount().
    if (created?.id) await harness.clearMessages(BLOCKER_PROBE.partnerId);
  } catch (error: any) {
    blockerPresent = true;
    blockerFailure = error;
  }
};

/* ------------------------------------------------------------------------- */
/* Fixtures and helpers                                                       */
/* ------------------------------------------------------------------------- */

const PASSWORD = 'S3cret!acceptance';

let harness: ITransactionalEmailHarness;
let sequence = 0;

const nextEmail = (label: string): string => {
  sequence += 1;
  return `${label}.${sequence}@${ACCEPTANCE_EMAIL_DOMAIN}`;
};

const registerUser = async (email: string): Promise<any> =>
  harness.userService.selfRegister(
    { email, password: PASSWORD, firstName: 'Ada', lastName: 'Lovelace' },
    {},
    harness.partner,
  );

const postForgot = (email: string) =>
  request(harness.app).post('/useraccount/forgot').send({ email });

const postRegister = (email: string) =>
  request(harness.app)
    .post('/useraccount/register')
    .send({ user: { email, password: PASSWORD, firstName: 'Ada', lastName: 'Lovelace' } });

/**
 * Render the message the route asked the sender to send, through the
 * production render path.
 *
 * `sendRequests[0]` is the payload the real `CommunicatorService.send()` was
 * called with; `renderTemplate` is the production method that
 * `send()` uses, including `validateVariables()`. Nothing is re-implemented
 * here - only the persistence/transport stage is absent (defect D1).
 */
const renderSendRequest = async (index = 0): Promise<any> => {
  const payload = harness.sendRequests[index];
  expect(payload).toBeDefined();
  return (harness.communicatorService as any).renderTemplate(
    payload.templateId,
    payload.templateData,
  );
};

/** Non-empty subject, html and text - never "a document exists". */
const expectRenderedContent = (content: any): void => {
  expect(typeof content.subject).toBe('string');
  expect(content.subject.trim().length).toBeGreaterThan(0);

  expect(typeof content.html).toBe('string');
  expect(content.html.trim().length).toBeGreaterThan(0);

  expect(typeof content.text).toBe('string');
  expect(content.text.trim().length).toBeGreaterThan(0);
};

/** The view of the template document the route actually resolved by id. */
const resolvedViewOf = async (templateId: string): Promise<string> => {
  const document: any = await CommunicatorTemplateModel.findById(templateId).lean();
  expect(document).toBeTruthy();
  return document.view;
};

const loggedErrors = (): any[] => mockLogger.error.mock.calls;

/** Flatten every logged argument to a searchable string. */
const loggedText = (): string =>
  loggedErrors()
    .map((call: any[]) =>
      call
        .map((entry) => {
          if (entry instanceof Error) return `${entry.name}: ${entry.message}`;
          if (entry && typeof entry === 'object') return JSON.stringify(entry);
          return String(entry);
        })
        .join(' '),
    )
    .join('\n');

/**
 * The `reason` the registration delivery catch block recorded.
 *
 * Scenario 10 has to say *which* stage failed, not merely that something did.
 * With defect D1 present the send dies at persistence (`Message.create`), so the
 * scenario exercises the non-fatal wrapper for a PERSISTENCE failure; the
 * provider-stage failure is only reachable once D1 is fixed. Asserting this
 * explicitly stops the scenario from claiming more than it observed - the review
 * asked for exactly that qualification.
 */
const activationFailureReason = (): string => {
  const call = loggedErrors().find(
    (args: any[]) =>
      typeof args[0] === 'string' &&
      args[0].indexOf('Failed to prepare or send registration activation email') !== -1,
  );
  const detail = call && call[1] && typeof call[1] === 'object' ? call[1] : undefined;
  return String((detail as any)?.reason || '');
};

/* ------------------------------------------------------------------------- */
/* Evidence (printed at the end; paste into the matrix, never transcribe)     */
/* ------------------------------------------------------------------------- */

interface IEvidenceRow {
  scenario: string;
  layer: 'template + render' | 'delivery';
  templateView: string;
  subject: string;
  /**
   * The HTTP status the test actually observed, read from the response object
   * the assertions ran on - never typed in by hand.
   *
   * The review asked for this because a matrix row that says PASS without a
   * status is unfalsifiable: while D1 exists `/forgot` answers 500, and a row
   * that did not state that would read as if the happy path had been observed.
   */
  http: string;
  state: 'PASS' | 'FAIL' | 'NOT RUN';
  note?: string;
}

const evidence: IEvidenceRow[] = [];

const record = (row: IEvidenceRow): void => {
  evidence.push(row);
};

/* ------------------------------------------------------------------------- */

beforeAll(async () => {
  harness = await createHarness();
  // Observe D1 once, through the production call, before any test asserts
  // anything that depends on it. This is what lets the guard fail with ONE
  // instruction instead of every /forgot test failing with 500-vs-200.
  await probeBlocker();
});

afterAll(async () => {
  if (harness) await harness.teardown();
  await disconnect();
});

beforeEach(async () => {
  jest.clearAllMocks();
  harness.resetObservations();
  await harness.clearEmailSettings();
  await harness.clearMessages();
});

afterEach(() => {
  if (harness) harness.resetObservations();
});

/* ========================================================================= */
/* BLOCKER                                                                   */
/* ========================================================================= */

/**
 * COHERENCE GUARD - runs in EVERY state, deliberately.
 *
 * NOT conditional on DELIVERY_ENABLED. An earlier revision put this inside
 * `blockerDescribe` (which is `describe.skip` exactly when the flag is true), so
 * the reverse-disagreement branch - flag true, D1 still present - was unreachable
 * dead code: both guard tests printed "skipped" and six delivery tests failed
 * with no instruction anywhere. Reproduced by running that state before fixing.
 *
 * One assertion, always executed: the OBSERVED blocker state must agree with the
 * flag. On disagreement it throws an instruction and is the only failing test.
 */
describe('D1 guard - the suite state is coherent', () => {
  it('instructs when DELIVERY_ENABLED disagrees with the observed state', () => {
    expect(blockerPresent).not.toBeNull(); // the probe ran in beforeAll

    // Fix landed without the flag being flipped: the delivery layer is silently
    // not being covered.
    if (blockerPresent === false && DELIVERY_ENABLED === false) {
      throw new Error(INSTRUCTION.fixedButFlagOff);
    }

    // Flag flipped while the blocker is still present: every delivery test would
    // fail for a reason that reads as a broken suite. Say so once instead.
    if (blockerPresent === true && DELIVERY_ENABLED === true) {
      throw new Error(INSTRUCTION.flagOnButStillBlocked);
    }
  });
});

/**
 * DIAGNOSTIC - evidence for the skip, only meaningful while the blocker exists.
 *
 * Conditionally skipped when the delivery layer is expected to run: in the
 * coherent-and-unblocked world there is nothing to diagnose, and these tests are
 * what makes the seven delivery skips evidence-backed rather than an excuse.
 */
const blockerDescribe = DELIVERY_ENABLED ? describe.skip : describe;

blockerDescribe('D1 diagnostics - what the blocker is', () => {
  it('is a required-id validation failure from the production createMessage()', () => {
    if (blockerPresent === false) return; // coherence guard owns the mismatch case

    // The real service against the real schema - the call the send path makes.
    expect(blockerFailure).not.toBeNull();

    const detail = JSON.stringify(blockerFailure.details || blockerFailure.toJSON?.() || {});
    expect(`${blockerFailure.message} ${detail}`).toMatch(/id.*is required/i);
  });

  it('shows the same blocker through the route: POST /forgot cannot deliver', async () => {
    if (blockerPresent === false) return;

    const email = nextEmail('blocker-reset');
    await registerUser(email);
    harness.resetObservations();

    const response = await postForgot(email);

    // The route is honest about it: 500, not a silent success.
    expect(response.status).toBe(500);
    expect(String(response.body.message)).toMatch(/Failed to create message/i);
    // No email reached the adapter.
    expect(harness.adapterCalls()).toHaveLength(0);
  });
});

/* ========================================================================= */
/* Scenario 1 - password reset, no setting (default template)                 */
/* ========================================================================= */

describe('scenario 1 - password reset uses the default forgot-password-email template', () => {
  it('resolves and renders the default template with the resetLink interpolated', async () => {
    const email = nextEmail('s1');
    await registerUser(email);
    harness.resetObservations();

    const response = await postForgot(email);
    expect(response.status).toBe(resetStatus()); // D1: 500 while the send cannot persist a message
    expect(harness.sendRequests).toHaveLength(1);

    const payload = harness.sendRequests[0];
    const view = await resolvedViewOf(String(payload.templateId));
    expect(view).toBe('forgot-password-email');

    const content = await renderSendRequest(0);
    expectRenderedContent(content);

    // The template owns the subject: the route's last-resort literal must lose.
    expect(content.subject).not.toBe(passwordResetFallbackSubject(harness.partner.name));

    // The interpolated link is really in the rendered body.
    const link = firstLinkIn(content.html);
    expect(link).toBeDefined();
    expect(link).toContain('https://acceptance.example.com/forgot-password?auth_token=');
    expect(content.html).toContain(link as string);

    // ... and it is the link the route put in the template data.
    expect(payload.templateData.resetLink).toBe(link);

    record({
      scenario: '1 - password reset, no setting',
      layer: 'template + render',
      http: `POST /useraccount/forgot -> ${response.status}`,
      templateView: view,
      subject: content.subject,
      state: 'PASS',
    });
  });

  deliveryIt('delivers exactly one email carrying that rendered content', async () => {
    const email = nextEmail('s1-delivery');
    await registerUser(email);
    harness.resetObservations();

    const response = await postForgot(email);
    expect(response.status).toBe(200);

    const tick = await harness.dispatch();
    expect(tick.succeeded).toBe(1);

    const calls = harness.adapterCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].payload.to).toBe(email);

    const content = calls[0].payload.content;
    expectRenderedContent(content);
    expect(content.subject).not.toBe(passwordResetFallbackSubject(harness.partner.name));
    expect(firstLinkIn(content.html)).toContain('auth_token=');

    expect(await harness.messageCount()).toBe(1);

    record({
      scenario: '1 - password reset, no setting',
      layer: 'delivery',
      http: `POST /useraccount/forgot -> ${response.status}`,
      templateView: 'forgot-password-email',
      subject: content.subject,
      state: 'PASS',
      note: 'provider adapter received 1 email',
    });
  });
});

/* ========================================================================= */
/* Scenario 2 - registration, no setting (default activation template)        */
/* ========================================================================= */

describe('scenario 2 - registration uses the default activation-email template', () => {
  it('creates the user, returns a JWT and renders activationLink into the body', async () => {
    const email = nextEmail('s2');
    harness.resetObservations();

    const response = await postRegister(email);

    // Registration is non-fatal on delivery failure by design: account first.
    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.split('.')).toHaveLength(3);

    const created: any = await User.findOne({ email });
    expect(created).toBeTruthy();
    expect(created.activatedAt).toBeNull();

    expect(harness.sendRequests).toHaveLength(1);
    const payload = harness.sendRequests[0];
    const view = await resolvedViewOf(String(payload.templateId));
    expect(view).toBe('activation-email');

    const content = await renderSendRequest(0);
    expectRenderedContent(content);
    expect(content.subject).not.toBe(registrationFallbackSubject(harness.partner.name));

    const link = payload.templateData.activationLink as string;
    expect(link).toContain('https://acceptance.example.com/useraccount/activate?token=');
    // The seeded activation body prints the link as text, not as an anchor.
    expect(content.html).toContain(link);
    expect(content.text).toContain(link);

    record({
      scenario: '2 - registration, no setting',
      layer: 'template + render',
      http: `POST /useraccount/register -> ${response.status}`,
      templateView: view,
      subject: content.subject,
      state: 'PASS',
    });
  });

  deliveryIt('delivers exactly one activation email', async () => {
    const email = nextEmail('s2-delivery');
    harness.resetObservations();

    const response = await postRegister(email);
    expect(response.status).toBe(200);

    await harness.dispatch();
    const calls = harness.adapterCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].payload.to).toBe(email);

    const content = calls[0].payload.content;
    expectRenderedContent(content);
    expect(content.html).toContain('token=');

    record({
      scenario: '2 - registration, no setting',
      layer: 'delivery',
      http: `POST /useraccount/register -> ${response.status}`,
      templateView: 'activation-email',
      subject: content.subject,
      state: 'PASS',
      note: 'provider adapter received 1 email',
    });
  });
});

/* ========================================================================= */
/* Scenario 3 - password reset with an application override                   */
/* ========================================================================= */

const CUSTOM_RESET_VIEW = 'acceptance-reset-email';
const CUSTOM_RESET_SUBJECT = 'Custom reset for <%= applicationTitle %>';
const CUSTOM_RESET_BODY =
  '<div dir="<%= dir || \'ltr\' %>"><p>ACCEPTANCE-CUSTOM-RESET</p><p><a href="<%= resetLink %>">Custom reset link</a></p></div>';

describe('scenario 3 - the application override is honoured for password reset', () => {
  beforeEach(async () => {
    await harness.installTemplate({
      view: CUSTOM_RESET_VIEW,
      subject: CUSTOM_RESET_SUBJECT,
      html: CUSTOM_RESET_BODY,
    });
    await harness.setSetting('email_template_password_reset', CUSTOM_RESET_VIEW);
  });

  it('uses the custom template, not the default', async () => {
    const email = nextEmail('s3');
    await registerUser(email);
    harness.resetObservations();

    const response = await postForgot(email);
    expect(response.status).toBe(resetStatus());

    expect(harness.sendRequests).toHaveLength(1);
    const payload = harness.sendRequests[0];

    const view = await resolvedViewOf(String(payload.templateId));
    expect(view).toBe(CUSTOM_RESET_VIEW);
    expect(view).not.toBe('forgot-password-email');

    const content = await renderSendRequest(0);
    expectRenderedContent(content);

    expect(content.subject).toBe('Custom reset for Acceptance Application');
    expect(content.subject).not.toBe(passwordResetFallbackSubject(harness.partner.name));
    expect(content.html).toContain('ACCEPTANCE-CUSTOM-RESET');

    const link = firstLinkIn(content.html);
    expect(link).toContain('https://acceptance.example.com/forgot-password?auth_token=');
    expect(payload.templateData.resetLink).toBe(link);

    record({
      scenario: '3 - password reset, application override',
      layer: 'template + render',
      http: `POST /useraccount/forgot -> ${response.status}`,
      templateView: view,
      subject: content.subject,
      state: 'PASS',
    });
  });

  deliveryIt('delivers the custom subject and body', async () => {
    const email = nextEmail('s3-delivery');
    await registerUser(email);
    harness.resetObservations();

    const response = await postForgot(email);
    expect(response.status).toBe(200);
    await harness.dispatch();

    const calls = harness.adapterCalls();
    expect(calls).toHaveLength(1);
    const content = calls[0].payload.content;

    expectRenderedContent(content);
    expect(content.subject).toBe('Custom reset for Acceptance Application');
    expect(content.html).toContain('ACCEPTANCE-CUSTOM-RESET');
    expect(content.html).not.toContain('Below is a reset password link');

    record({
      scenario: '3 - password reset, application override',
      layer: 'delivery',
      http: `POST /useraccount/forgot -> ${response.status}`,
      templateView: CUSTOM_RESET_VIEW,
      subject: content.subject,
      state: 'PASS',
      note: 'custom subject and body reached the provider adapter',
    });
  });
});

/* ========================================================================= */
/* Scenario 4 - registration with an application override                     */
/* ========================================================================= */

const CUSTOM_ACTIVATION_VIEW = 'acceptance-activation-email';
const CUSTOM_ACTIVATION_SUBJECT = 'Confirm your <%= applicationTitle %> account';
const CUSTOM_ACTIVATION_BODY =
  '<div dir="<%= dir || \'ltr\' %>"><p>ACCEPTANCE-CUSTOM-ACTIVATION</p><p><%= activationLink %></p></div>';

describe('scenario 4 - the application override is honoured for registration', () => {
  beforeEach(async () => {
    await harness.installTemplate({
      view: CUSTOM_ACTIVATION_VIEW,
      subject: CUSTOM_ACTIVATION_SUBJECT,
      html: CUSTOM_ACTIVATION_BODY,
    });
    await harness.setSetting('email_template_registration', CUSTOM_ACTIVATION_VIEW);
  });

  it('uses the custom template, not the default', async () => {
    const email = nextEmail('s4');
    harness.resetObservations();

    const response = await postRegister(email);
    expect(response.status).toBe(200);

    expect(harness.sendRequests).toHaveLength(1);
    const payload = harness.sendRequests[0];

    const view = await resolvedViewOf(String(payload.templateId));
    expect(view).toBe(CUSTOM_ACTIVATION_VIEW);
    expect(view).not.toBe('activation-email');

    const content = await renderSendRequest(0);
    expectRenderedContent(content);
    expect(content.subject).toBe('Confirm your Acceptance Application account');
    expect(content.html).toContain('ACCEPTANCE-CUSTOM-ACTIVATION');

    const link = payload.templateData.activationLink as string;
    expect(content.html).toContain(link);
    expect(content.text).toContain(link);

    record({
      scenario: '4 - registration, application override',
      layer: 'template + render',
      http: `POST /useraccount/register -> ${response.status}`,
      templateView: view,
      subject: content.subject,
      state: 'PASS',
    });
  });

  deliveryIt('delivers the custom subject and body', async () => {
    const email = nextEmail('s4-delivery');
    harness.resetObservations();

    const response = await postRegister(email);
    expect(response.status).toBe(200);
    await harness.dispatch();

    const calls = harness.adapterCalls();
    expect(calls).toHaveLength(1);
    const content = calls[0].payload.content;

    expectRenderedContent(content);
    expect(content.subject).toBe('Confirm your Acceptance Application account');
    expect(content.html).toContain('ACCEPTANCE-CUSTOM-ACTIVATION');
    expect(content.html).not.toContain('Please take a moment to complete your registration');

    record({
      scenario: '4 - registration, application override',
      layer: 'delivery',
      http: `POST /useraccount/register -> ${response.status}`,
      templateView: CUSTOM_ACTIVATION_VIEW,
      subject: content.subject,
      state: 'PASS',
    });
  });
});

/* ========================================================================= */
/* Scenario 5 - override points at a missing template (fails loudly)          */
/* ========================================================================= */

describe('scenario 5 - an override naming a missing template fails loudly', () => {
  it('fails password reset with an error naming the setting and the value, and sends no default', async () => {
    const missingView = 'this-template-does-not-exist';
    await harness.setSetting('email_template_password_reset', missingView);

    const email = nextEmail('s5-reset');
    await registerUser(email);
    harness.resetObservations();

    const response = await postForgot(email);

    expect(response.status).toBe(500);
    const message = String(response.body.message || '');
    expect(message).toContain('email_template_password_reset');
    expect(message).toContain(missingView);
    expect(message).toMatch(/does not fall back to the default/i);

    // Nothing was sent and no default was silently substituted.
    expect(harness.sendRequests).toHaveLength(0);
    expect(harness.adapterCalls()).toHaveLength(0);
    expect(await harness.messageCount()).toBe(0);

    record({
      scenario: '5 - override points at a missing template (reset)',
      layer: 'template + render',
      http: `POST /useraccount/forgot -> ${response.status}`,
      templateView: missingView,
      subject: '(none - resolution failed before render)',
      state: 'PASS',
      note: '500 naming email_template_password_reset and the missing view; no fallback',
    });
  });

  it('fails registration non-fatally, naming the setting and the value, and sends no default', async () => {
    const missingView = 'this-activation-template-does-not-exist';
    await harness.setSetting('email_template_registration', missingView);

    const email = nextEmail('s5-register');
    harness.resetObservations();

    const response = await postRegister(email);

    // Non-fatal by owner decision: the account is created, the failure is logged.
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();

    const created: any = await User.findOne({ email });
    expect(created).toBeTruthy();

    const text = loggedText();
    expect(text).toContain('Failed to prepare or send registration activation email');
    expect(text).toContain('email_template_registration');
    expect(text).toContain(missingView);

    expect(harness.adapterCalls()).toHaveLength(0);
    expect(await harness.messageCount()).toBe(0);

    record({
      scenario: '5 - override points at a missing template (registration)',
      layer: 'template + render',
      http: `POST /useraccount/register -> ${response.status}`,
      templateView: missingView,
      subject: '(none - resolution failed before render)',
      state: 'PASS',
      note: '200 + user created; failure logged naming email_template_registration and the missing view',
    });
  });
});

/* ========================================================================= */
/* Scenario 6 - setting present but malformed is treated as unset             */
/* ========================================================================= */

describe('scenario 6 - a malformed setting is treated as unset and the default is used', () => {
  it.each([
    ['empty string', ''],
    ['null', null],
    ['empty object', {}],
  ])('falls back to the default for a setting of %s', async (_label: string, value: any) => {
    await harness.setSetting('email_template_password_reset', value);

    const email = nextEmail('s6');
    await registerUser(email);
    harness.resetObservations();

    const response = await postForgot(email);
    expect(response.status).toBe(resetStatus());

    expect(harness.sendRequests).toHaveLength(1);
    const payload = harness.sendRequests[0];
    const view = await resolvedViewOf(String(payload.templateId));

    // The default was used, quietly - the documented behaviour for an unusable
    // (as opposed to an explicit-and-wrong) setting.
    expect(view).toBe('forgot-password-email');
    expect(harness.resolvedViews).toContain('forgot-password-email');

    const content = await renderSendRequest(0);
    expectRenderedContent(content);
    expect(content.subject).not.toBe(passwordResetFallbackSubject(harness.partner.name));

    record({
      scenario: `6 - malformed setting (${_label})`,
      layer: 'template + render',
      http: `POST /useraccount/forgot -> ${response.status}`,
      templateView: view,
      subject: content.subject,
      state: 'PASS',
    });
  });

  deliveryIt('delivers the default template for a malformed registration setting', async () => {
    await harness.setSetting('email_template_registration', {});
    const email = nextEmail('s6-delivery');
    harness.resetObservations();

    const registrationResponse = await postRegister(email);
    expect(registrationResponse.status).toBe(200);
    await harness.dispatch();

    const calls = harness.adapterCalls();
    expect(calls).toHaveLength(1);
    const content = calls[0].payload.content;
    expectRenderedContent(content);

    record({
      scenario: '6 - malformed setting (registration)',
      layer: 'delivery',
      http: `POST /useraccount/register -> ${registrationResponse.status}`,
      templateView: 'activation-email',
      subject: content.subject,
      state: 'PASS',
    });
  });
});

/* ========================================================================= */
/* Scenario 7 - activation round trip                                         */
/* ========================================================================= */

describe('scenario 7 - the activation link from registration activates the account once', () => {
  it('marks the user activated, and a second call is idempotent', async () => {
    const email = nextEmail('s7');
    harness.resetObservations();

    expect((await postRegister(email)).status).toBe(200);

    // The link the registration flow minted and handed to the template. (In the
    // delivery layer below it is taken from the email body instead; the value is
    // the same - the seeded body prints `activationLink` verbatim.)
    const link = harness.sendRequests[0].templateData.activationLink as string;
    expect(link).toContain('/useraccount/activate?token=');

    const token = new URL(link).searchParams.get('token') as string;
    expect(token).toBeTruthy();

    const first = await request(harness.app).get(`/useraccount/activate?token=${token}`);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('activated');
    expect(first.body.message).toBe(ACTIVATION_MESSAGES.activated);

    const activated: any = await User.findOne({ email });
    expect(activated.activatedAt).toBeInstanceOf(Date);

    const second = await request(harness.app).get(`/useraccount/activate?token=${token}`);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('already_activated');
    expect(second.body.message).toBe(ACTIVATION_MESSAGES.already_activated);

    const unchanged: any = await User.findOne({ email });
    expect(new Date(unchanged.activatedAt).getTime()).toBe(
      new Date(activated.activatedAt).getTime(),
    );

    record({
      scenario: '7 - activation round trip',
      layer: 'template + render',
      http: `GET /useraccount/activate -> ${first.status}, repeat -> ${second.status}`,
      templateView: 'activation-email',
      subject: '(activation route exercised; see scenario 2 for the rendered subject)',
      state: 'PASS',
      note: 'activated once, second call idempotent, timestamp preserved',
    });
  });

  deliveryIt('activates from the link the recipient received in the email body', async () => {
    const email = nextEmail('s7-delivery');
    harness.resetObservations();

    expect((await postRegister(email)).status).toBe(200);
    await harness.dispatch();

    const content = harness.adapterCalls()[0].payload.content;
    const link = /https:\/\/acceptance\.example\.com\/useraccount\/activate\?token=[^\s<"]+/.exec(
      content.text,
    );
    expect(link).toBeTruthy();

    const token = new URL(link![0]).searchParams.get('token') as string;
    const first = await request(harness.app).get(`/useraccount/activate?token=${token}`);
    expect(first.body.status).toBe('activated');
    const second = await request(harness.app).get(`/useraccount/activate?token=${token}`);
    expect(second.body.status).toBe('already_activated');

    record({
      scenario: '7 - activation round trip (from delivered email)',
      layer: 'delivery',
      http: `GET /useraccount/activate -> ${first.status}, repeat -> ${second.status}`,
      templateView: 'activation-email',
      subject: content.subject,
      state: 'PASS',
      note: 'link extracted from the email body the adapter received',
    });
  });
});

/* ========================================================================= */
/* Scenario 8 - expired activation token                                      */
/* ========================================================================= */

describe('scenario 8 - an expired activation token is rejected distinctly', () => {
  it('answers 410 expired_token and does not activate the account', async () => {
    const email = nextEmail('s8');
    const { user } = await registerUser(email);

    // The production token minter, with a clock two days in the past: a
    // well-formed token that is simply past its lifetime. Not a hand-built JWT.
    const { token } = createActivationToken(
      user,
      harness.partner,
      moment().subtract(2, 'days'),
    );

    const response = await request(harness.app).get(`/useraccount/activate?token=${token}`);

    expect(response.status).toBe(410);
    expect(response.body.status).toBe('expired_token');
    expect(response.body.message).toBe(ACTIVATION_MESSAGES.expired);

    const unchanged: any = await User.findOne({ email });
    expect(unchanged.activatedAt).toBeNull();

    // Distinct from an invalid token, which is a 400.
    const invalid = await request(harness.app).get('/useraccount/activate?token=not-a-token');
    expect(invalid.status).toBe(400);
    expect(invalid.body.status).toBe('invalid_token');

    record({
      scenario: '8 - expired activation token',
      layer: 'template + render',
      http: `GET /useraccount/activate -> ${response.status}; malformed token -> ${invalid.status}`,
      templateView: '(no template involved)',
      subject: '(none)',
      state: 'PASS',
      note: '410 expired_token; 400 invalid_token; account untouched',
    });
  });
});

/* ========================================================================= */
/* Scenario 9 - forgot for an unknown address                                 */
/* ========================================================================= */

describe('scenario 9 - forgot for an unknown address sends nothing and reveals nothing', () => {
  it('answers 200 with the generic acknowledgement and zero emails', async () => {
    const unknown = `nobody.${Date.now()}@${ACCEPTANCE_EMAIL_DOMAIN}`;
    harness.resetObservations();

    const response = await postForgot(unknown);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(PASSWORD_RESET_ACKNOWLEDGEMENT);

    expect(harness.sendRequests).toHaveLength(0);
    expect(harness.resolvedViews).toHaveLength(0);
    expect(harness.adapterCalls()).toHaveLength(0);
    expect(await harness.messageCount()).toBe(0);

    record({
      scenario: '9 - forgot for an unknown address',
      layer: 'template + render',
      http: `POST /useraccount/forgot -> ${response.status}`,
      templateView: '(none - no resolution attempted)',
      subject: '(none)',
      state: 'PASS',
      note:
        '200 with the generic acknowledgement; 0 sends. While D1 exists a KNOWN address answers 500 (scenario 1)' +
        ' while an unknown one answers 200, so the enumeration-safe parity the route is designed for is only' +
        ' restored once D1 is fixed.',
    });
  });
});

/* ========================================================================= */
/* Scenario 10 - provider failure during registration is non-fatal            */
/* ========================================================================= */

describe('scenario 10 - a send failure during registration is non-fatal', () => {
  it('still creates the user, still returns 200, and logs the failure', async () => {
    // Inject a provider-level failure the way a mail outage does: no healthy
    // email provider is available to the real registry when the send runs.
    await harness.registry.unregisterProvider('acceptance-email');

    const email = nextEmail('s10');
    harness.resetObservations();

    let response: any;
    try {
      response = await postRegister(email);
    } finally {
      harness.registry.registerProvider(harness.adapter as any);
    }

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.firstName).toBe('Ada');

    const created: any = await User.findOne({ email });
    expect(created).toBeTruthy();
    expect(created.activatedAt).toBeNull();

    // No email reached the adapter. A message row may exist once D1 is fixed:
    // the failure then happens at provider selection, after persistence.
    expect(harness.adapterCalls()).toHaveLength(0);

    const text = loggedText();
    expect(text).toContain('Failed to prepare or send registration activation email');
    expect(text).toContain('purpose');
    expect(text).toContain('registration');
    expect(text).toContain(email);

    // Which stage failed - machine-checked, not claimed in prose. This is the
    // qualification the review asked for: with D1 present the send dies at
    // persistence, so what is proven here is that the wrapper survives a
    // PERSISTENCE failure. The provider-stage path is exercised once the send
    // can get past persistence, i.e. after D1 is fixed.
    const reason = activationFailureReason();
    expect(reason.length).toBeGreaterThan(0);
    const stage = /id.*is required|Failed to create message/i.test(reason) ? 'persistence' : 'provider';
    expect(stage).toBe(blockerPresent ? 'persistence' : 'provider');

    record({
      scenario: '10 - send failure during registration is non-fatal',
      layer: 'template + render',
      http: `POST /useraccount/register -> ${response.status}`,
      templateView: '(resolution succeeded; the send failed)',
      subject: '(none - send failed before render)',
      state: 'PASS',
      note:
        `non-fatal wrapper proven for a ${stage}-stage failure (${reason}). ` +
        (blockerPresent
          ? 'D1 fails the send at Message.create, before provider selection; the provider-unavailable path is NOT proven until D1 is fixed.'
          : 'Provider unregistered, so this is the provider-unavailable path.'),
    });
  });

  deliveryIt('delivers nothing and reports the failure to the operator', async () => {
    await harness.registry.unregisterProvider('acceptance-email');
    const email = nextEmail('s10-delivery');
    harness.resetObservations();

    let response: any;
    try {
      response = await postRegister(email);
      await harness.dispatch();
    } finally {
      harness.registry.registerProvider(harness.adapter as any);
    }

    expect(response.status).toBe(200);
    expect(harness.adapterCalls()).toHaveLength(0);

    record({
      scenario: '10 - provider failure during registration (delivery)',
      layer: 'delivery',
      http: `POST /useraccount/register -> ${response.status}`,
      templateView: '(send failed)',
      subject: '(none)',
      state: 'PASS',
      note: 'no email delivered; registration unaffected',
    });
  });
});

/* ========================================================================= */
/* Evidence table                                                            */
/* ========================================================================= */

/**
 * Rows for the layers that could not execute. They are static because a skipped
 * test body does not run; the matrix marks them NOT RUN with the reason, exactly
 * as the channel acceptance matrix does for live carriers.
 */
const NOT_RUN_ROWS: IEvidenceRow[] = DELIVERY_ENABLED
  ? []
  : [
      {
        scenario: '1 - password reset, no setting',
        layer: 'delivery',
        http: '\u2014 (not executed)',
        templateView: 'forgot-password-email',
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1: Message.create rejects "id is required"',
      },
      {
        scenario: '2 - registration, no setting',
        layer: 'delivery',
        http: '\u2014 (not executed)',
        templateView: 'activation-email',
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1',
      },
      {
        scenario: '3 - password reset, application override',
        layer: 'delivery',
        http: '\u2014 (not executed)',
        templateView: CUSTOM_RESET_VIEW,
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1',
      },
      {
        scenario: '4 - registration, application override',
        layer: 'delivery',
        http: '\u2014 (not executed)',
        templateView: CUSTOM_ACTIVATION_VIEW,
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1',
      },
      {
        scenario: '6 - malformed setting (registration)',
        layer: 'delivery',
        http: '\u2014 (not executed)',
        templateView: 'activation-email',
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1',
      },
      {
        scenario: '7 - activation round trip (from delivered email)',
        layer: 'delivery',
        http: '\u2014 (not executed)',
        templateView: 'activation-email',
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1: the body the recipient would receive is never produced',
      },
      {
        scenario: '10 - provider failure during registration (delivery)',
        layer: 'delivery',
        http: '\u2014 (not executed)',
        templateView: '(send failed)',
        subject: '(none)',
        state: 'NOT RUN',
        note: 'blocked by D1: no dispatch stage is reachable',
      },
    ];

afterAll(() => {
  const rows = [...evidence, ...NOT_RUN_ROWS].map(
    (row) =>
      `| ${row.scenario} | ${row.layer} | ${row.http} | ${row.templateView} | ${row.subject} | ${row.state} | ${row.note || ''} |`,
  );
  const header =
    '| Scenario | Layer | HTTP observed | Template view used | Subject observed | Result | Note |';
  const divider = '|---|---|---|---|---|---|---|';
  process.stdout.write(
    `\n[E5 transactional email matrix] ${new Date().toISOString()}\n${header}\n${divider}\n${rows.join('\n')}\n\n`,
  );
});
