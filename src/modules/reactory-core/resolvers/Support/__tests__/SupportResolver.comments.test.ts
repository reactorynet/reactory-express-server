import SupportResolver from '../SupportResolver';

/**
 * TOOLS-001 regression — `ReactorySupportTicket.comments` contract.
 *
 * `SupportResolver.comments` has two input shapes:
 *
 *  - unpopulated (array of ObjectIds) → it queries with
 *    `removed: { $ne: true }`, `parent: { $exists: false }`, `sort({ createdAt: -1 })`;
 *  - populated (comment documents) → it used to return the array verbatim.
 *
 * Before TOOLS-001 the single-ticket read never populated `comments`, so the
 * details query (`ReactorySupportTicketByReference`) always took the filtered
 * branch: root comments only, moderated comments hidden, newest first. Once
 * `getTicketByReference` started populating, the early-return branch became
 * reachable and silently changed that public contract — replies leaked in as
 * roots, `removed` comments reappeared, and the order flipped to oldest-first.
 *
 * These tests pin both branches to the same projection so the two can never
 * disagree again.
 */

const mockCommentFind = jest.fn();

jest.mock('@reactory/server-modules/reactory-core/models/Comment', () => ({
  __esModule: true,
  default: { find: (...args: any[]) => mockCommentFind(...args) },
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  __esModule: true,
  CoreFile: { find: jest.fn() },
}));

const ROOT_NEW_ID = '6adabe605eebbf178c120001';
const ROOT_OLD_ID = '6adabe605eebbf178c120002';
const REPLY_ID = '6adabe605eebbf178c120003';
const REMOVED_ID = '6adabe605eebbf178c120004';

const user = (firstName: string) => ({ _id: '6adabe605eebbf178c120099', firstName, lastName: 'Tester' });

/** Populated comment documents, deliberately out of order in the fixture. */
const populatedComments = () => [
  {
    _id: ROOT_OLD_ID,
    text: 'first message',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    user: user('Ada'),
    removed: false,
  },
  {
    _id: REPLY_ID,
    text: 'a reply',
    createdAt: new Date('2026-01-03T10:00:00.000Z'),
    user: user('Sam'),
    parent: { _id: ROOT_OLD_ID },
    removed: false,
  },
  {
    _id: REMOVED_ID,
    text: 'moderated away',
    createdAt: new Date('2026-01-04T10:00:00.000Z'),
    user: user('Mod'),
    removed: true,
  },
  {
    _id: ROOT_NEW_ID,
    text: 'second message',
    createdAt: new Date('2026-01-02T10:00:00.000Z'),
    user: user('Ada'),
    removed: false,
    // An explicit null parent is still a root (every write path leaves the
    // field undefined); see `isReplyComment`.
    parent: null,
  },
];

const context = (): any => ({
  user: { _id: '6adabe605eebbf178c120099' },
  hasRole: jest.fn(() => true),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

/** Chainable `find().populate().sort()` mock for the unpopulated branch. */
const mockCommentQuery = (result: any[]) => {
  const query: any = {
    populate: jest.fn(() => query),
    sort: jest.fn(async () => result),
    exec: jest.fn(async () => result),
  };
  mockCommentFind.mockReturnValue(query);
  return query;
};

describe('SupportResolver.comments — ticket-level comment projection', () => {
  let resolver: any;

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = new SupportResolver();
  });

  describe('already-populated comments (the TOOLS-001 read path)', () => {
    it('returns only root comments — replies are dropped', async () => {
      const ticket: any = { comments: populatedComments() };

      const result = await resolver.comments(ticket, {}, context());

      expect(result.map((comment: any) => comment._id)).toEqual([ROOT_NEW_ID, ROOT_OLD_ID]);
      expect(result.some((comment: any) => comment._id === REPLY_ID)).toBe(false);
    });

    it('hides moderated (removed) comments', async () => {
      const ticket: any = { comments: populatedComments() };

      const result = await resolver.comments(ticket, {}, context());

      expect(result.some((comment: any) => comment._id === REMOVED_ID)).toBe(false);
    });

    it('returns the roots newest first, matching the query branch order', async () => {
      const ticket: any = { comments: populatedComments() };

      const result = await resolver.comments(ticket, {}, context());

      expect(result.map((comment: any) => new Date(comment.createdAt).toISOString())).toEqual([
        '2026-01-02T10:00:00.000Z',
        '2026-01-01T10:00:00.000Z',
      ]);
    });

    it('does not query for comments when they are already populated', async () => {
      const ticket: any = { comments: populatedComments() };

      await resolver.comments(ticket, {}, context());

      expect(mockCommentFind).not.toHaveBeenCalled();
    });

    it('does not mutate the ticket document', async () => {
      const comments = populatedComments();
      const ticket: any = { comments };

      await resolver.comments(ticket, {}, context());

      // The service returns comments oldest-first; the GraphQL projection must
      // not reorder the document it was handed.
      expect(comments.map((comment: any) => comment._id)).toEqual([
        ROOT_OLD_ID,
        REPLY_ID,
        REMOVED_ID,
        ROOT_NEW_ID,
      ]);
    });

    it('tolerates a populated reply whose parent is a bare id', async () => {
      const ticket: any = {
        comments: [
          {
            _id: REPLY_ID,
            text: 'reply with an unpopulated parent',
            createdAt: new Date('2026-01-05T10:00:00.000Z'),
            parent: ROOT_OLD_ID,
          },
        ],
      };

      await expect(resolver.comments(ticket, {}, context())).resolves.toEqual([]);
    });

    it('returns an empty list when every comment is filtered out', async () => {
      const ticket: any = {
        comments: [
          { _id: REMOVED_ID, text: 'gone', createdAt: new Date(), removed: true },
        ],
      };

      await expect(resolver.comments(ticket, {}, context())).resolves.toEqual([]);
    });
  });

  describe('unpopulated comments (unchanged behaviour)', () => {
    it('still queries root, non-removed comments newest first', async () => {
      const query = mockCommentQuery([
        { _id: ROOT_NEW_ID, text: 'second message' },
        { _id: ROOT_OLD_ID, text: 'first message' },
      ]);
      const ticket: any = { comments: [ROOT_OLD_ID, ROOT_NEW_ID] };

      const result = await resolver.comments(ticket, {}, context());

      expect(mockCommentFind).toHaveBeenCalledWith({
        _id: { $in: [ROOT_OLD_ID, ROOT_NEW_ID] },
        removed: { $ne: true },
        parent: { $exists: false },
      });
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result.map((comment: any) => comment._id)).toEqual([ROOT_NEW_ID, ROOT_OLD_ID]);
    });

    it('returns an empty list when the ticket has no comments', async () => {
      await expect(resolver.comments({ comments: [] } as any, {}, context())).resolves.toEqual([]);
      expect(mockCommentFind).not.toHaveBeenCalled();
    });
  });
});
