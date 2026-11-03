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
 * KNOWN BLOCKER - the delivery layer cannot execute (defect D1)
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
 * here. The guard test in "blocker" below proves it, and it fails the moment
 * the defect is fixed - which is the signal to flip DELIVERY_ENABLED.
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
 * Flip to `true` once defect D1 is fixed (see the file header). The guard test
 * in `describe('blocker ...')` fails first and tells you to do exactly that.
 */
const DELIVERY_ENABLED = false;

const deliveryIt = DELIVERY_ENABLED ? it : it.skip;

/**
 * The status `/forgot` answers with.
 *
 * 500 while D1 is present (the send cannot persist a message); 200 once it is
 * fixed. Written as a branch rather than two assertions so the same suite is
 * honest in both states, and so neither value can quietly drift.
 */
const resetStatus = (): number => (DELIVERY_ENABLED ? 200 : 500);

/** The blocker guard is only meaningful while the blocker exists. */
const blockerDescribe = DELIVERY_ENABLED ? describe.skip : describe;
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

/* ------------------------------------------------------------------------- */
/* Evidence (printed at the end; paste into the matrix, never transcribe)     */
/* ------------------------------------------------------------------------- */

interface IEvidenceRow {
  scenario: string;
  layer: 'template + render' | 'delivery';
  templateView: string;
  subject: string;
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

blockerDescribe('blocker - the production send path cannot persist a message (defect D1)', () => {
  it('proves the blocker: MessageService.createMessage rejects with "id is required"', async () => {
    // Driven through the real service against the real schema. This is the
    // assertion that makes the delivery-layer skip below evidence-backed rather
    // than an excuse: when the defect is fixed this test fails, and the failure
    // message says to flip DELIVERY_ENABLED.
    let failure: any;
    try {
      await harness.messageService.createMessage({
        partnerId: harness.partnerId,
        userId: 'acceptance-user',
        channel: 'email',
        to: `blocker@${ACCEPTANCE_EMAIL_DOMAIN}`,
        subject: 'blocker probe',
        content: { subject: 'blocker probe', text: 'body', html: '<p>body</p>' },
      });
    } catch (error: any) {
      failure = error;
    }

    expect(failure).toBeDefined();
    const detail = JSON.stringify(failure.details || failure.toJSON?.() || {});
    expect(`${failure.message} ${detail}`).toMatch(/id.*is required/i);
    if (!DELIVERY_ENABLED) {
      expect(await harness.messageCount()).toBe(0);
    } else {
      throw new Error(
        'The message-persistence blocker is fixed. Flip DELIVERY_ENABLED to true in ' +
          'transactionalEmail.acceptance.test.ts so the delivery layer runs.',
      );
    }
  });

  it('shows the same blocker through the route: POST /forgot cannot deliver', async () => {
    const email = nextEmail('blocker-reset');
    await registerUser(email);
    harness.resetObservations();

    const response = await postForgot(email);

    // The route is honest about it: 500, not a silent success.
    expect(response.status).toBe(500);
    expect(String(response.body.message)).toMatch(/Failed to create message/i);
    // No email reached the adapter. (A message row may exist once D1 is fixed:
    // the failure then happens at provider selection, after persistence.)
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
  ])('falls back to the default for a %s setting', async (_label: string, value: any) => {
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
      templateView: view,
      subject: content.subject,
      state: 'PASS',
    });
  });

  deliveryIt('delivers the default template for a malformed registration setting', async () => {
    await harness.setSetting('email_template_registration', {});
    const email = nextEmail('s6-delivery');
    harness.resetObservations();

    expect((await postRegister(email)).status).toBe(200);
    await harness.dispatch();

    const calls = harness.adapterCalls();
    expect(calls).toHaveLength(1);
    const content = calls[0].payload.content;
    expectRenderedContent(content);

    record({
      scenario: '6 - malformed setting (registration)',
      layer: 'delivery',
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

    record({
      scenario: '10 - provider failure during registration',
      layer: 'template + render',
      templateView: '(resolution succeeded; the send failed)',
      subject: '(none - send failed before render)',
      state: 'PASS',
      note:
        '200 + user created + failure logged. NOTE: with D1 present the failure is MESSAGE_CREATE_FAILED ' +
        '(persistence) because it fires before provider selection; the provider is unregistered so the ' +
        'provider-unavailable path is what runs once D1 is fixed.',
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
        templateView: 'forgot-password-email',
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1: Message.create rejects "id is required"',
      },
      {
        scenario: '2 - registration, no setting',
        layer: 'delivery',
        templateView: 'activation-email',
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1',
      },
      {
        scenario: '3 - password reset, application override',
        layer: 'delivery',
        templateView: CUSTOM_RESET_VIEW,
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1',
      },
      {
        scenario: '4 - registration, application override',
        layer: 'delivery',
        templateView: CUSTOM_ACTIVATION_VIEW,
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1',
      },
      {
        scenario: '6 - malformed setting (registration)',
        layer: 'delivery',
        templateView: 'activation-email',
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1',
      },
      {
        scenario: '7 - activation round trip (from delivered email)',
        layer: 'delivery',
        templateView: 'activation-email',
        subject: '(not observed)',
        state: 'NOT RUN',
        note: 'blocked by D1: the body the recipient would receive is never produced',
      },
      {
        scenario: '10 - provider failure during registration (delivery)',
        layer: 'delivery',
        templateView: '(send failed)',
        subject: '(none)',
        state: 'NOT RUN',
        note: 'blocked by D1: no dispatch stage is reachable',
      },
    ];

afterAll(() => {
  const rows = [...evidence, ...NOT_RUN_ROWS].map(
    (row) =>
      `| ${row.scenario} | ${row.layer} | ${row.templateView} | ${row.subject} | ${row.state} | ${row.note || ''} |`,
  );
  const header =
    '| Scenario | Layer | Template view used | Subject observed | Result | Note |';
  const divider = '|---|---|---|---|---|---|';
  process.stdout.write(
    `\n[E5 transactional email matrix] ${new Date().toISOString()}\n${header}\n${divider}\n${rows.join('\n')}\n\n`,
  );
});
