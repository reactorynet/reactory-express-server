/**
 * `userEmails` — the Microsoft branch after AZ-19.
 *
 * The resolver used to call the deprecated `O365.getEmails(token, filter)` shim,
 * pulling the access token out of the User document itself. It now resolves
 * `azure.AzureMailService@1.0.0` through `context.getService(...)` and passes the
 * **user id**: credential resolution (vaulted token first, AZ-01's legacy bridge
 * onto the User document second) belongs to the service, not to a resolver.
 *
 * These tests pin the two things a migration like this can silently break:
 *
 *   * the `Email` row shape — the nine keys the retired `object-mapper` spec
 *     produced, with `receivedDateTime` feeding both `receivedAt` and
 *     `createdAt`, and `sender.emailAddress.address` feeding `from`;
 *   * the call itself — a user id, never a token, for a user whose only
 *     credential is the legacy User-document token and for a user who has no
 *     listed authentication at all (a future vault-only connection).
 *
 * A fake service is used: no Graph call is made and the azure module is not
 * imported, so this suite runs in a server-only checkout.
 */
import { ObjectId } from 'mongodb';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// The resolver only ever touches this one static; mocking the barrel keeps
// mongoose (and every other core model) out of the suite.
jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  EmailQueue: {
    UserEmailsWithTextSearch: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const UserEmails = require('../UserEmails').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AZURE_MAIL_SERVICE_ID, MICROSOFT_MAIL_SELECT, toUserEmail } = require('../UserEmails');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EmailQueue } = require('@reactory/server-modules/reactory-core/models');

/** What `azure.AzureMailService.listMessages` hands back: normalised messages. */
const graphMessage = (overrides: Record<string, any> = {}): Record<string, any> => ({
  id: 'AAMkAD-1',
  conversationId: 'conv-1',
  subject: 'Invoice 4711',
  bodyPreview: 'Your invoice',
  body: { contentType: 'html', content: '<p>Your invoice is attached</p>' },
  from: { name: 'Billing', address: 'from@contoso.test' },
  sender: { name: 'Billing Bot', address: 'sender@contoso.test' },
  toRecipients: [{ address: 'ada@example.com' }],
  ccRecipients: [],
  bccRecipients: [],
  replyTo: [],
  receivedDateTime: '2026-11-07T09:30:00Z',
  sentDateTime: '2026-11-07T09:29:58Z',
  isRead: true,
  categories: [],
  ...overrides,
});

interface FixtureOptions {
  /** The message page the fake service resolves. */
  items?: any[];
  /** The caller's Outlook address, as the schema exposes it. */
  email?: string;
  /** `microsoft` entry to place on the User document (the legacy credential). */
  legacyMicrosoftAuth?: any;
}

const fixture = (options: FixtureOptions = {}) => {
  const userId = new ObjectId();

  // A real User document is not needed: the resolver reads `_id` and `fullName`
  // only. `getAuthentication` is spied on to prove it is never called - the
  // token must not be read here at all.
  const user: any = {
    _id: userId,
    email: options.email || 'ada@example.com',
    fullName: jest.fn(() => 'Ada Lovelace'),
    getAuthentication: jest.fn(() => options.legacyMicrosoftAuth),
    authentications: options.legacyMicrosoftAuth ? [options.legacyMicrosoftAuth] : undefined,
  };

  const listMessages = jest.fn().mockResolvedValue({ items: options.items ?? [graphMessage()] });
  const mailService = { listMessages };

  const context: any = {
    user,
    getService: jest.fn((id: string) => {
      if (id !== AZURE_MAIL_SERVICE_ID) throw new Error(`unexpected service ${id}`);
      return mailService;
    }),
  };

  return { userId, user, listMessages, context };
};

const invoke = async (context: any, mailFilter: any = { via: ['microsoft'] }) =>
  UserEmails.Query.userEmails({}, { mailFilter }, context);

describe('userEmails — Microsoft mail via azure.AzureMailService@1.0.0', () => {
  beforeEach(() => {
    (EmailQueue.UserEmailsWithTextSearch as jest.Mock).mockReset();
    (EmailQueue.UserEmailsWithTextSearch as jest.Mock).mockResolvedValue([]);
  });

  it('resolves the mail service through context.getService by its FQN', async () => {
    const { context } = fixture();

    await invoke(context);

    expect(context.getService).toHaveBeenCalledTimes(1);
    expect(context.getService).toHaveBeenCalledWith(AZURE_MAIL_SERVICE_ID);
    expect(AZURE_MAIL_SERVICE_ID).toBe('azure.AzureMailService@1.0.0');
  });

  it('passes the user id, and no token, to the service', async () => {
    const { userId, user, listMessages, context } = fixture();

    await invoke(context);

    expect(listMessages).toHaveBeenCalledTimes(1);
    expect(listMessages.mock.calls[0][0]).toBe(`${userId}`);

    // Nothing in the call may be a credential: not the access token, not any
    // authentication object, and the resolver must not read the User document's
    // authentication at all - the service's legacy bridge does that.
    const serialisedArgs = JSON.stringify(listMessages.mock.calls[0]);
    expect(serialisedArgs).not.toMatch(/accessToken|oauthToken|refreshToken|Bearer/i);
    expect(user.getAuthentication).not.toHaveBeenCalled();
  });

  it('returns exactly the Email row shape the legacy object-mapper produced', async () => {
    const { context } = fixture();

    const result: any[] = await invoke(context);

    expect(result).toHaveLength(1);
    // `toStrictEqual` pins the key set: no extra field and no dropped field.
    expect(result[0]).toStrictEqual({
      id: 'AAMkAD-1',
      format: 'html',
      message: '<p>Your invoice is attached</p>',
      from: 'sender@contoso.test',
      sentAt: '2026-11-07T09:29:58Z',
      receivedAt: '2026-11-07T09:30:00Z',
      createdAt: '2026-11-07T09:30:00Z',
      subject: 'Invoice 4711',
      isRead: true,
    });
    expect(Object.keys(result[0]).sort()).toEqual([
      'createdAt',
      'format',
      'from',
      'id',
      'isRead',
      'message',
      'receivedAt',
      'sentAt',
      'subject',
    ]);
  });

  it('keeps the key set for a message with no sender, body or dates', async () => {
    const { context } = fixture({ items: [{ id: 'minimal' }] });

    const result: any[] = await invoke(context);

    // The legacy mapper always emitted all nine keys; missing values were
    // undefined and resolved to null in GraphQL. That must not change.
    expect(Object.keys(result[0]).sort()).toEqual([
      'createdAt',
      'format',
      'from',
      'id',
      'isRead',
      'message',
      'receivedAt',
      'sentAt',
      'subject',
    ]);
    expect(result[0]).toEqual({
      id: 'minimal',
      format: undefined,
      message: undefined,
      from: undefined,
      sentAt: undefined,
      receivedAt: undefined,
      createdAt: undefined,
      subject: undefined,
      isRead: undefined,
    });
  });

  it('maps the same fields through the exported toUserEmail helper', async () => {
    // Guards the exported mapper directly, so a future caller that maps a single
    // message cannot drift from the resolver.
    expect(toUserEmail(graphMessage())).toEqual({
      id: 'AAMkAD-1',
      format: 'html',
      message: '<p>Your invoice is attached</p>',
      from: 'sender@contoso.test',
      sentAt: '2026-11-07T09:29:58Z',
      receivedAt: '2026-11-07T09:30:00Z',
      createdAt: '2026-11-07T09:30:00Z',
      subject: 'Invoice 4711',
      isRead: true,
    });
  });

  it('requests the legacy projection and page size, and quotes the search term', async () => {
    const { listMessages, context } = fixture();

    await invoke(context, { via: ['microsoft'], search: 'invoice 4711' });

    const options = listMessages.mock.calls[0][1];
    // The shim selected the message body and sender; the mapper reads both.
    expect(options.select).toBe(MICROSOFT_MAIL_SELECT);
    expect(options.select).toContain('body');
    expect(options.select).toContain('sender');
    // The shim sent no `$top`, so Graph applied its default of 10.
    expect(options.top).toBe(10);
    // `$search` is a quoted KQL expression, exactly as the shim sent it.
    expect(options.search).toBe('"invoice 4711"');
  });

  it('sends no search option when the filter carries no term', async () => {
    const { listMessages, context } = fixture();

    await invoke(context, { via: ['microsoft'], search: '   ' });

    expect(listMessages.mock.calls[0][1]).not.toHaveProperty('search');
  });

  it('keeps working for a legacy user whose only credential is the User document token', async () => {
    // AZ-01's legacy bridge reads this entry; the resolver must still hand over
    // the id and let the service find it.
    const legacyMicrosoftAuth = {
      provider: 'microsoft',
      lastLogin: new Date('2026-11-01T08:00:00Z'),
      props: { accessToken: 'legacy-access-token', oauthToken: { token: { refresh_token: 'legacy-refresh' } } },
    };
    const { userId, listMessages, context } = fixture({ legacyMicrosoftAuth });

    const result: any[] = await invoke(context);

    expect(listMessages.mock.calls[0][0]).toBe(`${userId}`);
    expect(result[0].subject).toBe('Invoice 4711');
  });

  it('keeps working for a user with no listed authentication (vault-only connection)', async () => {
    // A user who connected through the new OAuth flow has an `AzureToken` row and
    // no `microsoft` entry on the User document. The resolver must not filter
    // them out before the service can resolve their vaulted credential.
    const { listMessages, context } = fixture();
    context.user.authentications = undefined;

    const result: any[] = await invoke(context);

    expect(listMessages).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  it('merges local and Microsoft mail and sorts by createdAt, as before', async () => {
    const localEmail = {
      id: 'local-1',
      subject: 'Queued locally',
      createdAt: new Date('2026-11-06T10:00:00Z'),
    };
    (EmailQueue.UserEmailsWithTextSearch as jest.Mock).mockResolvedValue([localEmail]);

    const { context } = fixture({
      items: [
        graphMessage({ id: 'remote-1', receivedDateTime: '2026-11-05T10:00:00Z' }),
        graphMessage({ id: 'remote-2', receivedDateTime: '2026-11-08T10:00:00Z' }),
      ],
    });

    const result: any[] = await invoke(context, { via: ['local', 'microsoft'], search: 'mail' });

    expect(EmailQueue.UserEmailsWithTextSearch).toHaveBeenCalledWith(
      context.user,
      expect.objectContaining({ search: 'mail', via: ['local', 'microsoft'] }),
    );
    // Membership, not mixed-type ordering: the surviving `lodash.sortBy(...)`
    // line compares a mongoose `Date` against a Graph ISO string, which is the
    // behaviour this ticket must not change. What is pinned here is that both
    // sources reach the caller in one list, exactly as before.
    expect(result.map((row) => row.id).sort()).toEqual(['local-1', 'remote-1', 'remote-2']);
  });

  it('does not touch the Microsoft service when only local mail is requested', async () => {
    const { context } = fixture();

    await invoke(context, { via: ['local'] });

    expect(context.getService).not.toHaveBeenCalled();
  });

  it('still refuses a filter that names no provider', async () => {
    const { context } = fixture();

    await expect(UserEmails.Query.userEmails({}, { mailFilter: {} }, context)).rejects.toThrow(
      'Please indicate via which search provider you want to search',
    );
    await expect(UserEmails.Query.userEmails({}, { mailFilter: null }, context)).rejects.toThrow(
      'Please indicate via which search provider you want to search',
    );
  });
});
