import ReactorySupportService from '../ReactorySupportService';
import { InsufficientPermissions } from '@reactory/server-core/exceptions';

/**
 * TOOLS-001 — the support read paths must expose the conversation and the
 * attachments.
 *
 * Before this change `getTicket` returned `comments: [ObjectId, ...]` and
 * `documents: [ObjectId, ...]`, which is useless to an agent (or a person)
 * trying to understand the ticket. The tests below pin the three fixes:
 *
 *  - single-ticket reads populate the people, the comments (with their authors)
 *    and the documents;
 *  - `getTicketComments` returns a stable oldest→newest transcript with
 *    explicit reply threading and resolved comment attachments;
 *  - `listTicketDocuments` returns resolvable attachment metadata;
 *  - all of them keep using the ticket's existing view permission;
 *  - list/paged reads stay lean (no comment bodies).
 *
 * The model layer is mocked exactly like the neighbouring
 * `ReactorySupportService.getTicketByReference.test.ts` suite — this repository
 * has no live-Mongo harness for unit tests, and the service is the unit under
 * test here, not Mongoose.
 */

const mockTicketFindById = jest.fn();
const mockTicketFindOne = jest.fn();
const mockTicketFind = jest.fn();
const mockCommentFind = jest.fn();
const mockFileFind = jest.fn();

jest.mock('../../models/ReactorySupportTicket', () => ({
  __esModule: true,
  default: {
    findById: (...args: any[]) => mockTicketFindById(...args),
    findOne: (...args: any[]) => mockTicketFindOne(...args),
    find: (...args: any[]) => mockTicketFind(...args),
  },
}));

jest.mock('../../models/Comment', () => ({
  __esModule: true,
  default: {
    find: (...args: any[]) => mockCommentFind(...args),
  },
}));

jest.mock('@reactory/server-modules/reactory-core/models/CoreFile', () => ({
  __esModule: true,
  default: {
    find: (...args: any[]) => mockFileFind(...args),
  },
}));

const REFERENCE = 'REACTORY-302016408/20261023/439279156';

const TICKET_ID = '507f1f77bcf86cd799439011';
const OWNER_ID = '507f1f77bcf86cd799439012';
const OTHER_ID = '507f1f77bcf86cd799439013';
const AUTHOR_ID = '507f1f77bcf86cd799439014';
const COMMENT_1_ID = '507f1f77bcf86cd799439015';
const COMMENT_2_ID = '507f1f77bcf86cd799439016';
const DOCUMENT_ID = '507f1f77bcf86cd799439017';
const COMMENT_FILE_ID = '507f1f77bcf86cd799439018';
const REPLY_FILE_ID = '507f1f77bcf86cd799439019';

const OWNER = { _id: OWNER_ID, firstName: 'Olivia', lastName: 'Owner', email: 'owner@example.com' };
const ASSIGNEE = { _id: OTHER_ID, firstName: 'Sam', lastName: 'Support', email: 'sam@example.com' };
const AUTHOR = { _id: AUTHOR_ID, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };

const CONTEXT_FOR = (roles: string[], userId: string = OWNER_ID): any => ({
  user: { _id: userId, firstName: 'Test', lastName: 'User' },
  partner: { key: 'REACTORY' },
  hasRole: (role: string) => roles.includes(role),
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
});

/** A mongoose-shaped ticket: refs are ObjectIds (or populated documents). */
const ticketFixture = (overrides: Record<string, any> = {}): any => ({
  _id: TICKET_ID,
  reference: REFERENCE,
  request: 'Agent cannot see the conversation',
  description: 'Comments are returned as ObjectIds',
  createdBy: { toString: () => OWNER_ID },
  assignedTo: { toString: () => OTHER_ID },
  // Deliberately newest-first: the read must order by createdAt, not by the
  // order the ticket happens to reference them in.
  comments: [COMMENT_2_ID, COMMENT_1_ID],
  documents: [DOCUMENT_ID],
  ...overrides,
});

const documentFile = {
  _id: DOCUMENT_ID,
  filename: 'requirements.pdf',
  alias: 'requirements.pdf',
  link: 'http://localhost:4000/cdn/support-tickets/t1/requirements.pdf',
  size: 4096,
  mimetype: 'application/pdf',
};

const commentFile = {
  _id: COMMENT_FILE_ID,
  filename: 'screenshot.png',
  alias: 'shot.png',
  link: 'http://localhost:4000/cdn/support-tickets/t1/shot.png',
  size: 512,
  mimetype: 'image/png',
};

const replyFile = {
  _id: REPLY_FILE_ID,
  filename: 'run.log',
  alias: 'run.log',
  // No `link` (legacy row): the read path must build one from path + alias.
  path: '/support-tickets/t1',
  size: 64,
  mimetype: 'text/plain',
};

/** Users a populate can resolve, keyed by the id the fixture references. */
const USERS_BY_ID: Record<string, any> = {
  [OWNER_ID]: OWNER,
  [OTHER_ID]: ASSIGNEE,
  [AUTHOR_ID]: AUTHOR,
};

/** The id a raw ObjectId-like fixture value points at. */
const referencedId = (value: any): string => String(value?._id ?? value);

const COMMENT_FIXTURES = [
  {
    _id: COMMENT_1_ID,
    text: 'first message',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    user: AUTHOR,
    metadata: { attachments: [COMMENT_FILE_ID] },
  },
  {
    _id: COMMENT_2_ID,
    text: 'reply',
    createdAt: new Date('2026-01-02T10:00:00.000Z'),
    user: OWNER,
    parent: { _id: COMMENT_1_ID },
    metadata: { attachments: [{ fileId: REPLY_FILE_ID }] },
  },
];

type PopulateSpec = { path: string; populate?: any; options?: any };

/**
 * Minimal mongoose `populate` simulation: replace the fixture's refs with the
 * documents a real populate would load, so the assertion is about the value a
 * caller receives rather than about the fact that a mock was called.
 */
const applyPopulate = (ticket: any, spec: PopulateSpec[]): void => {
  const paths = (spec || []).map((entry) => entry.path);

  if (paths.includes('createdBy') && ticket.createdBy) {
    ticket.createdBy = USERS_BY_ID[referencedId(ticket.createdBy)] ?? ticket.createdBy;
  }
  if (paths.includes('assignedTo') && ticket.assignedTo) {
    ticket.assignedTo = USERS_BY_ID[referencedId(ticket.assignedTo)] ?? ticket.assignedTo;
  }
  if (paths.includes('updatedBy') && ticket.updatedBy) {
    ticket.updatedBy = USERS_BY_ID[referencedId(ticket.updatedBy)] ?? ticket.updatedBy;
  }

  if (paths.includes('documents')) {
    ticket.documents = (ticket.documents || []).map((document: any) =>
      String(document?._id ?? document) === DOCUMENT_ID ? documentFile : document,
    );
  }

  if (paths.includes('comments')) {
    const commentSpec: any = (spec || []).find((entry) => entry.path === 'comments');
    const populatedComments = (ticket.comments || []).map((comment: any) => {
      const id = String(comment?._id ?? comment);
      const fixture = COMMENT_FIXTURES.find((candidate) => candidate._id === id);
      if (!fixture) return comment;
      const populated: any = { ...fixture };
      if (commentSpec?.populate) populated.user = { ...fixture.user };
      return populated;
    });

    // Mongoose applies `options.sort` to the populated array; mirror that so
    // the assertion is about the order a caller actually receives.
    if (commentSpec?.options?.sort?.createdAt === 1) {
      populatedComments.sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    ticket.comments = populatedComments;
  }
};

/** Chainable query mock mirroring the bits of the mongoose API the service uses. */
const queryReturning = (value: any, onPopulate?: (spec: PopulateSpec[]) => void): any => {
  const query: any = {
    populate: jest.fn((spec: PopulateSpec[]) => {
      if (onPopulate) onPopulate(spec);
      return query;
    }),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    count: jest.fn(async () => (Array.isArray(value) ? value.length : 0)),
    exec: jest.fn(async () => value),
  };
  return query;
};

/** Wire `findById` for a getTicket-style read, populating the fixture. */
const mockTicketById = (ticket: any, onPopulate?: (spec: PopulateSpec[]) => void): any => {
  let query: any;
  query = queryReturning(ticket, (spec) => {
    applyPopulate(ticket, spec);
    if (onPopulate) onPopulate(spec);
  });
  mockTicketFindById.mockReturnValue(query);
  return query;
};

describe('ReactorySupportService read paths — TOOLS-001', () => {
  const originalCdnRoot = process.env.CDN_ROOT;

  beforeAll(() => {
    // Deterministic URLs regardless of the developer's local .env.
    process.env.CDN_ROOT = 'http://localhost:4000/cdn';
  });

  afterAll(() => {
    if (originalCdnRoot === undefined) delete process.env.CDN_ROOT;
    else process.env.CDN_ROOT = originalCdnRoot;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTicket', () => {
    it('populates the comments and their authors, not ObjectIds', async () => {
      const ticket = ticketFixture();
      const query = mockTicketById(ticket);
      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));

      const result: any = await service.getTicket(TICKET_ID);

      const spec: PopulateSpec[] = query.populate.mock.calls[0][0];
      const commentSpec = spec.find((entry) => entry.path === 'comments');
      expect(commentSpec).toBeDefined();
      // Author names require a nested populate of the comment's `user`.
      expect(commentSpec.populate).toEqual({ path: 'user' });

      expect(String(result.comments[0])).not.toBe(COMMENT_2_ID);
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0]).toMatchObject({ text: 'first message' });
      expect(result.comments[0].user).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace' });
      expect(result.comments[1].user).toMatchObject({ firstName: 'Olivia', lastName: 'Owner' });
    });

    it('populates the documents so a caller gets filenames, not ObjectIds', async () => {
      const ticket = ticketFixture();
      mockTicketById(ticket);
      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));

      const result: any = await service.getTicket(TICKET_ID);

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toMatchObject({
        _id: DOCUMENT_ID,
        filename: 'requirements.pdf',
        alias: 'requirements.pdf',
        mimetype: 'application/pdf',
        size: 4096,
      });
    });

    it('populates the people so a reader can name them', async () => {
      const ticket = ticketFixture();
      mockTicketById(ticket);
      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));

      const result: any = await service.getTicket(TICKET_ID);

      expect(result.createdBy).toMatchObject({ firstName: 'Olivia', lastName: 'Owner' });
      expect(result.assignedTo).toMatchObject({ firstName: 'Sam', lastName: 'Support' });
    });
  });

  describe('getTicketByReference', () => {
    it('uses the same populate list as getTicket', async () => {
      const byIdTicket = ticketFixture();
      const byIdQuery = mockTicketById(byIdTicket);
      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));
      await service.getTicket(TICKET_ID);

      const byReferenceTicket = ticketFixture();
      let byReferenceQuery: any;
      byReferenceQuery = queryReturning(byReferenceTicket, (spec) => {
        applyPopulate(byReferenceTicket, spec);
      });
      mockTicketFindOne.mockReturnValue(byReferenceQuery);

      const result: any = await service.getTicketByReference(REFERENCE);

      const byIdSpec: PopulateSpec[] = byIdQuery.populate.mock.calls[0][0];
      const byReferenceSpec: PopulateSpec[] = byReferenceQuery.populate.mock.calls[0][0];
      expect(byReferenceSpec.map((entry) => entry.path)).toEqual(byIdSpec.map((entry) => entry.path));
      expect(byReferenceSpec.map((entry) => entry.path)).toEqual(
        expect.arrayContaining(['createdBy', 'assignedTo', 'comments', 'documents']),
      );
      expect(result.comments[0].user).toMatchObject({ firstName: 'Ada' });
      expect(result.documents[0]).toMatchObject({ filename: 'requirements.pdf' });
    });
  });

  describe('getTicketComments', () => {
    const mockComments = (comments: any[], files: any[] = []) => {
      const commentQuery = queryReturning(comments);
      mockCommentFind.mockReturnValue(commentQuery);
      const fileQuery = queryReturning(files);
      mockFileFind.mockReturnValue(fileQuery);
      return { commentQuery, fileQuery };
    };

    it('returns oldest → newest with resolved authors, replies and attachments', async () => {
      const ticket = ticketFixture();
      mockTicketById(ticket);
      const { commentQuery } = mockComments(COMMENT_FIXTURES, [commentFile, replyFile]);

      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));
      const result = await service.getTicketComments(TICKET_ID);

      // Stable transcript order is enforced in the query, not left to storage.
      expect(commentQuery.sort).toHaveBeenCalledWith({ createdAt: 1, _id: 1 });
      expect(commentQuery.populate).toHaveBeenCalledWith({ path: 'user' });

      expect(result.map((comment) => comment.text)).toEqual(['first message', 'reply']);
      result.forEach((comment, index) => {
        const createdAt = new Date(comment.createdAt as Date).getTime();
        if (index > 0) {
          expect(createdAt).toBeGreaterThanOrEqual(new Date(result[index - 1].createdAt as Date).getTime());
        }
      });

      expect(result[0].author).toEqual({ id: AUTHOR_ID, name: 'Ada Lovelace' });
      expect(result[0].parentId).toBeNull();
      expect(result[0].attachments).toEqual([
        {
          id: COMMENT_FILE_ID,
          filename: 'screenshot.png',
          alias: 'shot.png',
          url: 'http://localhost:4000/cdn/support-tickets/t1/shot.png',
          size: 512,
          mimetype: 'image/png',
        },
      ]);

      // A reply is explicitly marked with its parent so a caller can thread it.
      expect(result[1].parentId).toBe(COMMENT_1_ID);
      expect(result[1].author).toEqual({ id: OWNER_ID, name: 'Olivia Owner' });
      expect(result[1].attachments).toEqual([
        {
          id: REPLY_FILE_ID,
          filename: 'run.log',
          alias: 'run.log',
          url: 'http://localhost:4000/cdn/support-tickets/t1/run.log',
          size: 64,
          mimetype: 'text/plain',
        },
      ]);
    });

    it('resolves all comment attachments in a single file query', async () => {
      mockTicketById(ticketFixture());
      mockComments(COMMENT_FIXTURES, [commentFile, replyFile]);

      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));
      await service.getTicketComments(TICKET_ID);

      expect(mockFileFind).toHaveBeenCalledTimes(1);
      expect(mockFileFind).toHaveBeenCalledWith({
        _id: { $in: expect.arrayContaining([expect.anything(), expect.anything()]) },
      });
    });

    it('returns an empty transcript without querying when there are no comments', async () => {
      mockTicketById(ticketFixture({ comments: [] }));
      mockComments([]);

      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));
      await expect(service.getTicketComments(TICKET_ID)).resolves.toEqual([]);
      expect(mockCommentFind).not.toHaveBeenCalled();
    });
  });

  describe('listTicketDocuments', () => {
    it('returns resolved attachment metadata', async () => {
      mockTicketById(ticketFixture());
      mockFileFind.mockReturnValue(queryReturning([documentFile]));

      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));
      const result = await service.listTicketDocuments(TICKET_ID);

      expect(result).toEqual([
        {
          id: DOCUMENT_ID,
          filename: 'requirements.pdf',
          alias: 'requirements.pdf',
          url: 'http://localhost:4000/cdn/support-tickets/t1/requirements.pdf',
          size: 4096,
          mimetype: 'application/pdf',
        },
      ]);
    });

    it('preserves the order the files were attached in', async () => {
      const second = { ...documentFile, _id: COMMENT_FILE_ID, filename: 'second.png', alias: 'second.png' };
      mockTicketById(ticketFixture({ documents: [DOCUMENT_ID, COMMENT_FILE_ID] }));
      // Return in the opposite order to prove the ticket order wins.
      mockFileFind.mockReturnValue(queryReturning([second, documentFile]));

      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));
      const result = await service.listTicketDocuments(TICKET_ID);

      expect(result.map((file) => file.filename)).toEqual(['requirements.pdf', 'second.png']);
    });

    it('returns an empty list without querying when nothing is attached', async () => {
      mockTicketById(ticketFixture({ documents: [] }));

      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));
      await expect(service.listTicketDocuments(TICKET_ID)).resolves.toEqual([]);
      expect(mockFileFind).not.toHaveBeenCalled();
    });
  });

  describe('permissions are unchanged', () => {
    // A plain user who neither raised nor is assigned to the ticket.
    const strangerContext = () => CONTEXT_FOR(['USER'], OTHER_ID);
    const foreignTicket = () =>
      ticketFixture({
        createdBy: { toString: () => OWNER_ID },
        assignedTo: { toString: () => AUTHOR_ID },
      });

    it('rejects getTicket', async () => {
      mockTicketById(foreignTicket());
      mockCommentFind.mockReturnValue(queryReturning(COMMENT_FIXTURES));
      mockFileFind.mockReturnValue(queryReturning([documentFile]));
      const service = new ReactorySupportService({} as any, strangerContext());

      await expect(service.getTicket(TICKET_ID)).rejects.toBeInstanceOf(InsufficientPermissions);
    });

    it('rejects getTicketComments without reading the conversation', async () => {
      mockTicketById(foreignTicket());
      const service = new ReactorySupportService({} as any, strangerContext());

      await expect(service.getTicketComments(TICKET_ID)).rejects.toBeInstanceOf(InsufficientPermissions);
      expect(mockCommentFind).not.toHaveBeenCalled();
      expect(mockFileFind).not.toHaveBeenCalled();
    });

    it('rejects listTicketDocuments without reading the files', async () => {
      mockTicketById(foreignTicket());
      const service = new ReactorySupportService({} as any, strangerContext());

      await expect(service.listTicketDocuments(TICKET_ID)).rejects.toBeInstanceOf(InsufficientPermissions);
      expect(mockFileFind).not.toHaveBeenCalled();
    });

    it('still lets the creator and support staff read', async () => {
      mockTicketById(ticketFixture());
      mockCommentFind.mockReturnValue(queryReturning(COMMENT_FIXTURES));
      mockFileFind.mockReturnValue(queryReturning([documentFile]));

      const creator = new ReactorySupportService({} as any, CONTEXT_FOR(['USER'], OWNER_ID));
      await expect(creator.getTicketComments(TICKET_ID)).resolves.toHaveLength(2);

      const support = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT'], AUTHOR_ID));
      await expect(support.listTicketDocuments(TICKET_ID)).resolves.toHaveLength(1);
    });
  });

  describe('list endpoints stay lean', () => {
    it('pagedRequest does not populate comments', async () => {
      const queries: any[] = [];
      mockTicketFind.mockImplementation(() => {
        const query = queryReturning([ticketFixture()]);
        queries.push(query);
        return query;
      });

      const service = new ReactorySupportService({} as any, CONTEXT_FOR(['SUPPORT']));
      const result: any = await service.pagedRequest({}, { page: 1, pageSize: 10 });

      expect(result.tickets).toHaveLength(1);
      // queries[0] is the count query, queries[1] the page query.
      const pageQuery = queries[queries.length - 1];
      const populated = pageQuery.populate.mock.calls.map((call: any[]) => call[0]);
      expect(populated).toEqual(['createdBy', 'assignedTo']);
      expect(populated.join(' ')).not.toContain('comments');
      expect(pageQuery.populate.mock.calls.map((call: any[]) => call[0]).join(' ')).not.toContain('documents');
    });
  });
});
