import { ObjectId } from 'mongodb';
import CommentModel from '../../../models/Comment';
import CommentResolver from '../Comment';
import { buildCommentCursorFilter, encodeCommentCursor } from '../commentPagination';

/**
 * REACTORY-302016408/20261107/149192668.
 *
 * The support ticket comments panel rendered only the first page of root
 * comments as if it were the whole conversation. The resolver now supports
 * keyset paging on `(createdAt, _id)` plus a server-side sort direction.
 *
 * These tests assert the contract the panel depends on:
 *  - page 1 is the true first page in the requested direction;
 *  - the next page is fetched from the cursor, not by skipping a moving window;
 *  - the last page reports `hasNext: false` and no cursor;
 *  - switching direction refetches from the top in the new direction;
 *  - the ordering (and the cursor) is total when timestamps are identical;
 *  - the server clamps oversized page requests.
 */
describe('CommentResolver — pagination', () => {
  const resolver: any = new CommentResolver();

  const id = (suffix: number) =>
    new ObjectId(`6aeee49fbc449064866c66${suffix.toString().padStart(2, '0')}`);

  const makeComment = (suffix: number, createdAt: string) => ({
    _id: id(suffix),
    text: `comment ${suffix}`,
    createdAt: new Date(createdAt),
    user: { _id: id(90), firstName: 'Ada', lastName: 'Tester' },
  });

  const mockContext = (): any => ({
    user: { _id: id(90), email: 'tester@reactory.net' },
    log: jest.fn(),
    emit: jest.fn(),
    hasRole: jest.fn().mockReturnValue(true),
  });

  const mockFindChain = (rows: any[]) => {
    const exec = jest.fn().mockResolvedValue(rows);
    const limit = jest.fn().mockReturnValue({ exec });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const populate = jest.fn().mockReturnValue({ sort });
    return { populate, sort, skip, limit, exec };
  };

  const pageRows = (count: number, startSuffix = 1) =>
    Array.from({ length: count }, (_, index) =>
      makeComment(startSuffix + index, `2026-11-06T13:00:${String(index % 60).padStart(2, '0')}.000Z`));

  afterEach(() => jest.restoreAllMocks());

  const run = (args: any, rows: any[], total: number) => {
    const chain = mockFindChain(rows);
    const findSpy = jest.spyOn(CommentModel as any, 'find').mockReturnValue(chain as any);
    jest.spyOn(CommentModel as any, 'countDocuments').mockResolvedValue(total as any);
    return { chain, findSpy };
  };

  it('first page: limits to page size + 1 and reports hasNext from the extra row', async () => {
    // 21 rows for a 20-row page: the 21st is what proves more exist.
    const rows = pageRows(21);
    const { chain, findSpy } = run({ context: 'ReactorySupportTicket', contextId: 'ticket-1' }, rows, 42);

    const result = await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1' },
      mockContext(),
    );

    expect(chain.limit).toHaveBeenCalledWith(21);
    expect(chain.skip).toHaveBeenCalledWith(0);
    // Total order: `_id` tie-breaks `createdAt` in the same direction.
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });

    // No cursor: the plain base filter is used (root comments, not removed).
    const query = findSpy.mock.calls[0][0] as any;
    expect(query.context).toBe('ReactorySupportTicket');
    expect(query.contextId).toBe('ticket-1');
    expect(query.parent).toEqual({ $exists: false });
    expect(query.removed).toEqual({ $ne: true });
    expect(query.$and).toBeUndefined();

    // The extra row is not rendered.
    expect(result.comments).toHaveLength(20);
    expect(result.comments[19]._id).toEqual(rows[19]._id);

    expect(result.paging).toEqual(expect.objectContaining({
      page: 1,
      pageSize: 20,
      total: 42,
      hasNext: true,
    }));
    expect(result.paging.nextCursor).toBe(encodeCommentCursor(rows[19]));
  });

  it('next page: applies the keyset predicate, skips nothing and appends after the cursor', async () => {
    const cursorRow = makeComment(20, '2026-11-06T12:59:59.000Z');
    const cursor = encodeCommentCursor(cursorRow) as string;
    const rows = pageRows(21, 21);
    const { chain, findSpy } = run(
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', cursor },
      rows,
      42,
    );

    const result = await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', cursor, sortOrder: 'NEWEST' },
      mockContext(),
    );

    // Cursor mode never uses offset: an offset would walk a moving window.
    expect(chain.skip).toHaveBeenCalledWith(0);

    const query = findSpy.mock.calls[0][0] as any;
    const keyset = buildCommentCursorFilter(
      { createdAt: cursorRow.createdAt, id: cursorRow._id },
      'NEWEST',
    );
    expect(query.$and).toEqual([expect.objectContaining({ parent: { $exists: false } }), keyset]);

    expect(result.comments).toHaveLength(20);
    expect(result.paging.hasNext).toBe(true);
    expect(result.paging.nextCursor).toBe(encodeCommentCursor(rows[19]));
  });

  it('last page: returns every remaining row, hasNext false and no cursor', async () => {
    const cursorRow = makeComment(40, '2026-11-06T12:00:00.000Z');
    const cursor = encodeCommentCursor(cursorRow) as string;
    const rows = pageRows(2, 41); // fewer than a page remain
    const { chain } = run({ context: 'ReactorySupportTicket', contextId: 'ticket-1', cursor }, rows, 42);

    const result = await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', cursor },
      mockContext(),
    );

    expect(chain.limit).toHaveBeenCalledWith(21);
    expect(result.comments).toHaveLength(2);
    expect(result.paging.hasNext).toBe(false);
    // No cursor means the client cannot offer a "load more" that would loop.
    expect(result.paging.nextCursor).toBeNull();
  });

  it('sort switch: OLDEST refetches from the top in the opposite direction', async () => {
    const rows = pageRows(21);
    const { chain, findSpy } = run({ context: 'ReactorySupportTicket', contextId: 'ticket-1' }, rows, 42);

    const result = await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', sortOrder: 'OLDEST' },
      mockContext(),
    );

    expect(chain.sort).toHaveBeenCalledWith({ createdAt: 1, _id: 1 });
    expect(chain.skip).toHaveBeenCalledWith(0);
    // The first page in the new direction, not a reversal of the old page.
    expect(result.comments[0]._id).toEqual(rows[0]._id);
    expect(result.paging.page).toBe(1);
    expect((findSpy.mock.calls[0][0] as any).$and).toBeUndefined();
  });

  it('OLDEST cursor moves forward through equal timestamps using the id tie-break', async () => {
    const cursorRow = makeComment(10, '2026-11-06T13:00:00.000Z');
    const cursor = encodeCommentCursor(cursorRow) as string;
    const rows = pageRows(21, 11);
    const { findSpy } = run({ context: 'ReactorySupportTicket', contextId: 'ticket-1', cursor }, rows, 42);

    await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', cursor, sortOrder: 'OLDEST' },
      mockContext(),
    );

    expect((findSpy.mock.calls[0][0] as any).$and[1]).toEqual({
      $or: [
        { createdAt: { $gt: cursorRow.createdAt } },
        { createdAt: cursorRow.createdAt, _id: { $gt: cursorRow._id } },
      ],
    });
  });

  it('stable ordering: identical timestamps still order and page by _id', async () => {
    // Two comments written in the same millisecond. Without the id tie-break
    // they would be free to swap between pages.
    const first = makeComment(1, '2026-11-06T13:00:00.000Z');
    const second = makeComment(2, '2026-11-06T13:00:00.000Z');

    const { chain } = run({ context: 'ReactorySupportTicket', contextId: 'ticket-1' }, [first, second], 2);

    await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1' },
      mockContext(),
    );

    const spec = chain.sort.mock.calls[0][0] as any;
    expect(spec).toEqual({ createdAt: -1, _id: -1 });

    // A cursor on the first row must still exclude it on the next page even
    // though the timestamp is identical to the row after it.
    const cursor = encodeCommentCursor(first) as string;
    const nextChain = mockFindChain([]);
    const nextFind = jest.spyOn(CommentModel as any, 'find').mockReturnValue(nextChain as any);
    // Same spy instance as the first call above; clear recorded calls so the
    // assertion really reads the cursor query.
    nextFind.mockClear();

    await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', cursor },
      mockContext(),
    );

    expect((nextFind.mock.calls[0][0] as any).$and[1]).toEqual({
      $or: [
        { createdAt: { $lt: first.createdAt } },
        { createdAt: first.createdAt, _id: { $lt: first._id } },
      ],
    });
  });

  it('clamps an oversized page request to the server maximum', async () => {
    const rows = pageRows(21);
    const { chain } = run({ context: 'ReactorySupportTicket', contextId: 'ticket-1' }, rows, 42);

    const result = await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', paging: { page: 1, pageSize: 5000 } },
      mockContext(),
    );

    expect(chain.limit).toHaveBeenCalledWith(101);
    expect(result.paging.pageSize).toBe(100);
  });

  it('rejects a malformed cursor instead of silently serving page 1 again', async () => {
    jest.spyOn(CommentModel as any, 'find').mockReturnValue(mockFindChain([]) as any);

    await expect(resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', cursor: 'nonsense' },
      mockContext(),
    )).rejects.toThrow('Invalid comment cursor');
  });

  it('logical page still works for existing offset callers', async () => {
    const rows = pageRows(21);
    const { chain } = run({ context: 'ReactorySupportTicket', contextId: 'ticket-1' }, rows, 42);

    await resolver.getCommentsByContext(
      {},
      { context: 'ReactorySupportTicket', contextId: 'ticket-1', paging: { page: 2, pageSize: 20 } },
      mockContext(),
    );

    expect(chain.skip).toHaveBeenCalledWith(20);
    expect(chain.limit).toHaveBeenCalledWith(21);
  });

  it('replies keep chronological order by default and are paged the same way', async () => {
    const rows = pageRows(51);
    const chain = mockFindChain(rows);
    jest.spyOn(CommentModel as any, 'find').mockReturnValue(chain as any);
    jest.spyOn(CommentModel as any, 'countDocuments').mockResolvedValue(60 as any);

    const result = await resolver.getCommentReplies(
      {},
      { commentId: id(1).toHexString() },
      mockContext(),
    );

    expect(chain.sort).toHaveBeenCalledWith({ createdAt: 1, _id: 1 });
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(51); // default reply page size 50 + 1
    expect(result.paging).toEqual(expect.objectContaining({
      page: 1,
      pageSize: 50,
      total: 60,
      hasNext: true,
    }));
    expect(result.paging.nextCursor).toBe(encodeCommentCursor(rows[49]));
  });
});
