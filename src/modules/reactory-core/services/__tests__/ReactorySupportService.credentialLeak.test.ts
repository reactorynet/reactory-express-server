import ReactorySupportService from '../ReactorySupportService';
import { USER_REFERENCE_SELECT } from '@reactory/server-modules/reactory-core/utils/userReferenceSelect';

/**
 * SECURITY (REACTORY-302016408) — no support read path may serialise user
 * credential material.
 *
 * `getSupportTicket` / `listSupportTickets` returned, per referenced user, the
 * PBKDF2 `password`, the `salt`, `sessionInfo[].jwtPayload.refresh` (a LIVE
 * refresh token) and `authentications[].props.accessToken` (a LIVE Google OAuth
 * token) - thirteen credentials in one response, including the sysadmin
 * account.
 *
 * The regression is proven end to end rather than by asserting that `.select()`
 * was called: the model is mocked so that a populate WITHOUT a projection hands
 * back the complete fixture (credentials included), and a populate WITH a
 * projection applies it. If a future change drops `select` from a populate -
 * or writes `context.user` (a full document) into the ticket - the fixture's
 * credentials survive into the result and the assertions below fail.
 */

const mockTicketFindById = jest.fn();
const mockTicketFindOne = jest.fn();
const mockTicketFind = jest.fn();
const mockCommentFind = jest.fn();
const mockFileFind = jest.fn();
const mockTicketConstructed: any[] = [];
const mockCommentConstructed: any[] = [];

jest.mock('../../models/ReactorySupportTicket', () => {
  const Model: any = function (this: any, doc: any) {
    const self = this;
    mockTicketConstructed.push(doc);
    Object.assign(self, doc);
    self._id = doc?._id || '507f1f77bcf86cd799439011';
    self.save = jest.fn(async () => self);
    self.populate = jest.fn(async (spec: any) => {
      mockApplyPopulate(self, spec);
      return self;
    });
  };
  Model.findById = (...args: any[]) => mockTicketFindById(...args);
  Model.findOne = (...args: any[]) => mockTicketFindOne(...args);
  Model.find = (...args: any[]) => mockTicketFind(...args);
  return { __esModule: true, default: Model };
});

jest.mock('../../models/Comment', () => {
  const Model: any = function (this: any, doc: any) {
    const self = this;
    mockCommentConstructed.push(doc);
    Object.assign(self, doc);
    self._id = '507f1f77bcf86cd799439099';
    self.save = jest.fn(async () => self);
    self.populate = jest.fn(async (spec: any) => {
      mockApplyPopulate(self, spec);
      return self;
    });
  };
  Model.find = (...args: any[]) => mockCommentFind(...args);
  return { __esModule: true, default: Model };
});

jest.mock('@reactory/server-modules/reactory-core/models/CoreFile', () => ({
  __esModule: true,
  default: { find: (...args: any[]) => mockFileFind(...args) },
}));

const TICKET_ID = '507f1f77bcf86cd799439011';
const OWNER_ID = '507f1f77bcf86cd799439012';
const ASSIGNEE_ID = '507f1f77bcf86cd799439013';
const AUTHOR_ID = '507f1f77bcf86cd799439014';
const COMMENT_ID = '507f1f77bcf86cd799439015';
const REFERENCE = 'REACTORY-302016408/20261113/4225071849';

/** What EVERY user document in the database actually looks like. */
const CREDENTIALS = {
  password: '$pbkdf2$10000$5f4dcc3b5aa765d61d8327deb882cf99$9a0364b9e99bb480dd25e1f0284c8555',
  salt: 'c0ffee1234567890c0ffee1234567890',
  sessionInfo: [
    {
      id: 'session-1',
      host: '10.0.0.5',
      client: 'reactory-pwa',
      refresh: 'eyJhbGciOiJIUzI1NiJ9.live-refresh-token.signature',
      jwtPayload: { userId: OWNER_ID, refresh: 'eyJhbGciOiJIUzI1NiJ9.live-refresh-token.signature' },
      jwtPayloadJson: '{"refresh":"eyJhbGciOiJIUzI1NiJ9.live-refresh-token.signature"}',
    },
  ],
  authentications: [
    {
      provider: 'google',
      props: { accessToken: 'ya29.a0AfH6SMB-live-google-oauth-token', refreshToken: '1//live-refresh' },
    },
  ],
  memberships: [{ clientId: '507f1f77bcf86cd7994390aa', roles: ['ADMIN'] }],
};

const userFixture = (id: string, firstName: string, lastName: string, email: string) => ({
  _id: id,
  firstName,
  lastName,
  email,
  username: email,
  ...CREDENTIALS,
});

const USERS: Record<string, any> = {
  [OWNER_ID]: userFixture(OWNER_ID, 'Olivia', 'Owner', 'owner@example.com'),
  [ASSIGNEE_ID]: userFixture(ASSIGNEE_ID, 'Sam', 'Support', 'sam@example.com'),
  [AUTHOR_ID]: userFixture(AUTHOR_ID, 'Ada', 'Lovelace', 'ada@example.com'),
};

const CONTEXT = (roles: string[], userId: string = OWNER_ID): any => ({
  user: { ...USERS[userId], _id: userId },
  partner: { key: 'REACTORY' },
  hasRole: (role: string) => roles.includes(role),
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  i18n: { t: (key: string) => key },
});

/** The credential shapes that must never appear in a serialised response. */
const CREDENTIAL_PATTERNS: RegExp[] = [
  /pbkdf2\$/,
  /"salt"\s*:/,
  /"refresh"\s*:/,
  /"accessToken"\s*:/,
  /"sessionInfo"\s*:/,
  /"authentications"\s*:/,
  /"memberships"\s*:/,
];

const expectNoCredentials = (value: any): void => {
  const serialised = JSON.stringify(value);
  CREDENTIAL_PATTERNS.forEach((pattern) => {
    expect(serialised).not.toMatch(pattern);
  });
};

type PopulateSpec = { path: string; select?: string; populate?: any; options?: any };

/**
 * Apply a populate the way mongoose would: no `select` returns the whole
 * document, a `select` returns only those fields.
 */
const mockApplyPopulate = (doc: any, spec: any): void => {
  if (!doc) return;
  if (Array.isArray(doc)) {
    doc.forEach((entry) => mockApplyPopulate(entry, spec));
    return;
  }
  const entries: PopulateSpec[] = Array.isArray(spec) ? spec : [spec];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || !entry.path) return;

    if (entry.path === 'comments') {
      doc.comments = (doc.comments || []).map((comment: any) => {
        const id = String(comment?._id ?? comment);
        const fixture = COMMENT_FIXTURE;
        if (id !== COMMENT_ID) return comment;
        const populated: any = { ...fixture, user: mockProjectUser(USERS[AUTHOR_ID], entry.populate?.select) };
        return populated;
      });
      return;
    }

    // Mongoose also accepts a space separated path list; the implementation no
    // longer uses it, but supporting it keeps the mock honest.
    entry.path.split(/\s+/).filter(Boolean).forEach((path) => {
      if (path === 'documents') return;
      const current = doc[path];
      if (current === null || current === undefined) return;
      const id = String(current?._id ?? current);
      if (!USERS[id]) return;
      doc[path] = mockProjectUser(USERS[id], entry.select);
    });
  });
};

const mockProjectUser = (user: any, select?: string): any => {
  if (!user || typeof user !== 'object') return user;
  if (!select) return user;
  const fields = select.split(/\s+/).filter(Boolean);
  return fields.reduce((projected: any, field: string) => {
    if (user[field] !== undefined) projected[field] = user[field];
    return projected;
  }, {});
};

const COMMENT_FIXTURE = {
  _id: COMMENT_ID,
  text: 'credentials are leaking',
  createdAt: new Date('2026-11-13T05:00:00.000Z'),
  user: AUTHOR_ID,
  metadata: {},
};

const mockQuery = (value: any): any => {
  const query: any = {
    populate: jest.fn((spec: any) => {
      mockApplyPopulate(value, spec);
      return query;
    }),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    count: jest.fn(async () => (Array.isArray(value) ? value.length : 1)),
    exec: jest.fn(async () => value),
  };
  return query;
};

const mockTicketFixture = (overrides: Record<string, any> = {}): any => {
  const ticket: any = {
    _id: TICKET_ID,
    reference: REFERENCE,
    request: 'SECURITY: credentials in the ticket response',
    description: 'Delete the passwords',
    status: 'new',
    createdBy: OWNER_ID,
    assignedTo: ASSIGNEE_ID,
    comments: [COMMENT_ID],
    documents: [],
    save: jest.fn(async () => ticket),
    populate: jest.fn(async (spec: any) => {
      mockApplyPopulate(ticket, spec);
      return ticket;
    }),
    ...overrides,
  };
  return ticket;
};

const mockCommentQuery = (comments: any[], files: any[] = []): any => {
  const query: any = {
    sort: jest.fn(() => query),
    populate: jest.fn((spec: any) => {
      comments.forEach((comment) => mockApplyPopulate(comment, spec));
      return query;
    }),
    exec: jest.fn(async () => comments),
  };
  mockCommentFind.mockReturnValue(query);
  mockFileFind.mockReturnValue(mockQuery(files));
  return query;
};

const populateSpecOf = (query: any): PopulateSpec[] => query.populate.mock.calls[0][0];

describe('SECURITY — support reads never serialise user credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTicketConstructed.length = 0;
    mockCommentConstructed.length = 0;
  });

  it('the fixture really does carry credentials (keeps the assertions honest)', () => {
    const serialised = JSON.stringify(USERS[OWNER_ID]);
    CREDENTIAL_PATTERNS.forEach((pattern) => {
      expect(serialised).toMatch(pattern);
    });
  });

  it('getTicket returns names, not password hashes or tokens', async () => {
    mockTicketFindById.mockReturnValue(mockQuery(mockTicketFixture()));
    const service = new ReactorySupportService({} as any, CONTEXT(['SUPPORT']));

    const result = await service.getTicket(TICKET_ID);

    expectNoCredentials(result);
    // The projection must not turn the people into bare ids either.
    expect(result.createdBy).toMatchObject({ _id: OWNER_ID, firstName: 'Olivia' });
    expect(result.assignedTo).toMatchObject({ _id: ASSIGNEE_ID, firstName: 'Sam' });
  });

  it('getTicketByReference returns names, not password hashes or tokens', async () => {
    mockTicketFindOne.mockReturnValue(mockQuery(mockTicketFixture()));
    const service = new ReactorySupportService({} as any, CONTEXT(['SUPPORT']));

    const result = await service.getTicketByReference(REFERENCE);

    expectNoCredentials(result);
    expect(result.createdBy).toMatchObject({ firstName: 'Olivia' });
  });

  it('pagedRequest (listSupportTickets) leaks nothing from either populated person', async () => {
    mockTicketFind.mockImplementation(() => mockQuery([mockTicketFixture()]));
    const service = new ReactorySupportService({} as any, CONTEXT(['SUPPORT']));

    const result: any = await service.pagedRequest({}, { page: 1, pageSize: 10 });

    expect(result.tickets).toHaveLength(1);
    expectNoCredentials(result);
    expect(result.tickets[0].createdBy).toMatchObject({ firstName: 'Olivia' });
  });

  it('createRequest persists the caller id, not the caller document', async () => {
    const service = new ReactorySupportService({} as any, CONTEXT(['USER'], OWNER_ID));

    const result: any = await service.createRequest('A leaking ticket', 'description');

    expectNoCredentials(result);
    expect(mockTicketConstructed).toHaveLength(1);
    const written = mockTicketConstructed[0];
    expect(written.createdBy).toBe(OWNER_ID);
    expect(written.updatedBy).toBe(OWNER_ID);
    expect(typeof written.createdBy).not.toBe('object');
  });

  it('updateTicket persists the caller id and returns no credentials', async () => {
    const ticket = mockTicketFixture();
    mockTicketFindById.mockReturnValue(mockQuery(ticket));
    // The caller is the ticket's creator, so the permission check passes.
    const service = new ReactorySupportService({} as any, CONTEXT(['USER'], OWNER_ID));

    const result: any = await service.updateTicket(TICKET_ID, { status: 'open' });

    expect(result.updatedBy).toBe(OWNER_ID);
    expectNoCredentials(result);
  });

  it('addComment returns the projected author, not the author document', async () => {
    mockTicketFindById.mockReturnValue(mockQuery(mockTicketFixture()));
    const service = new ReactorySupportService({} as any, CONTEXT(['USER'], OWNER_ID));

    const result: any = await service.addComment(TICKET_ID, 'a comment');

    expectNoCredentials(result);
    expect(result.user).toMatchObject({ _id: OWNER_ID, firstName: 'Olivia' });
  });

  it('getTicketComments serialises an author id + name and nothing else', async () => {
    mockTicketFindById.mockReturnValue(mockQuery(mockTicketFixture()));
    mockCommentQuery([{ ...COMMENT_FIXTURE }], []);
    const service = new ReactorySupportService({} as any, CONTEXT(['SUPPORT']));

    const result = await service.getTicketComments(TICKET_ID);

    expectNoCredentials(result);
    expect(result[0].author).toEqual({ id: AUTHOR_ID, name: 'Ada Lovelace' });
  });

  it('every populated user reference uses the shared projection', async () => {
    const ticket = mockTicketFixture();
    const query = mockQuery(ticket);
    mockTicketFindById.mockReturnValue(query);
    const service = new ReactorySupportService({} as any, CONTEXT(['SUPPORT']));

    await service.getTicket(TICKET_ID);

    const spec = populateSpecOf(query);
    ['createdBy', 'assignedTo', 'updatedBy'].forEach((path) => {
      const entry = spec.find((candidate) => candidate.path === path);
      expect(entry).toBeDefined();
      expect(entry.select).toBe(USER_REFERENCE_SELECT);
      expect(entry.select).not.toMatch(/password|salt|sessionInfo|authentications|memberships/);
    });

    const comments = spec.find((candidate) => candidate.path === 'comments');
    expect(comments.populate.select).toBe(USER_REFERENCE_SELECT);
  });
});
