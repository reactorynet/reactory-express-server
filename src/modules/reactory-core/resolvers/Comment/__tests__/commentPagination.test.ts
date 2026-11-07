import { ObjectId } from 'mongodb';
import {
  DEFAULT_COMMENT_PAGE_SIZE,
  DEFAULT_REPLY_PAGE_SIZE,
  MAX_COMMENT_PAGE_SIZE,
  buildCommentCursorFilter,
  clampCommentPageSize,
  commentSortSpec,
  decodeCommentCursor,
  encodeCommentCursor,
  resolveCommentSortOrder,
} from '../commentPagination';

/**
 * REACTORY-302016408/20261107/149192668.
 *
 * The support ticket comments panel used to render one page as if it were the
 * whole conversation. These tests pin the keyset contract the panel now relies
 * on: a total order on `(createdAt, _id)`, a bounded page size, and a cursor
 * that maps to "strictly after this row" in the requested direction.
 */
describe('commentPagination', () => {
  const id = (suffix: number) => new ObjectId(`6aeee49fbc449064866c66${suffix.toString().padStart(2, '0')}`);
  const at = (iso: string) => new Date(iso);

  describe('clampCommentPageSize', () => {
    it('defaults to 20 for root comments and 50 for replies', () => {
      expect(clampCommentPageSize(undefined)).toBe(DEFAULT_COMMENT_PAGE_SIZE);
      expect(clampCommentPageSize(null)).toBe(DEFAULT_COMMENT_PAGE_SIZE);
      expect(clampCommentPageSize(undefined, DEFAULT_REPLY_PAGE_SIZE)).toBe(DEFAULT_REPLY_PAGE_SIZE);
    });

    it('enforces the maximum page size the server will honour', () => {
      expect(clampCommentPageSize(MAX_COMMENT_PAGE_SIZE + 1)).toBe(MAX_COMMENT_PAGE_SIZE);
      expect(clampCommentPageSize(10_000)).toBe(MAX_COMMENT_PAGE_SIZE);
      // Nothing can ask for an unbounded page.
      expect(clampCommentPageSize(Number.MAX_SAFE_INTEGER)).toBe(MAX_COMMENT_PAGE_SIZE);
    });

    it('ignores zero, negative and non-numeric requests instead of returning an empty page', () => {
      expect(clampCommentPageSize(0)).toBe(DEFAULT_COMMENT_PAGE_SIZE);
      expect(clampCommentPageSize(-5)).toBe(DEFAULT_COMMENT_PAGE_SIZE);
      expect(clampCommentPageSize(Number.NaN)).toBe(DEFAULT_COMMENT_PAGE_SIZE);
      expect(clampCommentPageSize(7.9)).toBe(7);
    });
  });

  describe('resolveCommentSortOrder', () => {
    it('accepts the GraphQL enum values', () => {
      expect(resolveCommentSortOrder('NEWEST')).toBe('NEWEST');
      expect(resolveCommentSortOrder('OLDEST')).toBe('OLDEST');
    });

    it('falls back to the caller default for absent or unknown values', () => {
      expect(resolveCommentSortOrder(undefined)).toBe('NEWEST');
      expect(resolveCommentSortOrder('SIDEWAYS')).toBe('NEWEST');
      expect(resolveCommentSortOrder(undefined, 'OLDEST')).toBe('OLDEST');
    });
  });

  describe('commentSortSpec', () => {
    it('orders newest-first with the id tie-break in the same direction', () => {
      expect(commentSortSpec('NEWEST')).toEqual({ createdAt: -1, _id: -1 });
    });

    it('orders oldest-first with the id tie-break in the same direction', () => {
      expect(commentSortSpec('OLDEST')).toEqual({ createdAt: 1, _id: 1 });
    });

    it('is a total order — the id is always present as a tie-break', () => {
      // Comments routinely land in the same millisecond; without the id the
      // order between them is undefined and rows shuffle between pages.
      ['NEWEST', 'OLDEST'].forEach((order) => {
        const spec = commentSortSpec(order as 'NEWEST' | 'OLDEST');
        expect(Object.keys(spec)).toEqual(['createdAt', '_id']);
        expect(spec.createdAt).toBe(spec._id);
      });
    });
  });

  describe('cursor round-trip', () => {
    it('encodes and decodes the (createdAt, _id) pair', () => {
      const row = { _id: id(1), createdAt: at('2026-11-06T13:00:03.665Z') };
      const cursor = encodeCommentCursor(row);

      expect(typeof cursor).toBe('string');

      const decoded = decodeCommentCursor(cursor as string);
      expect(decoded.createdAt.toISOString()).toBe('2026-11-06T13:00:03.665Z');
      expect(decoded.id.toHexString()).toBe(row._id.toHexString());
    });

    it('preserves millisecond precision, so a shared second is still separable', () => {
      const first = encodeCommentCursor({ _id: id(1), createdAt: at('2026-11-06T13:00:03.100Z') });
      const second = encodeCommentCursor({ _id: id(2), createdAt: at('2026-11-06T13:00:03.900Z') });

      expect(decodeCommentCursor(first as string).createdAt.getTime())
        .toBeLessThan(decodeCommentCursor(second as string).createdAt.getTime());
    });

    it('returns null for rows with no usable identity', () => {
      expect(encodeCommentCursor(null)).toBeNull();
      expect(encodeCommentCursor({ _id: id(1) })).toBeNull();
      expect(encodeCommentCursor({ createdAt: at('2026-11-06T13:00:03.665Z') })).toBeNull();
      expect(encodeCommentCursor({ _id: 'not-an-object-id', createdAt: at('2026-11-06T13:00:03.665Z') })).toBeNull();
    });

    it('rejects malformed cursors rather than silently restarting at page 1', () => {
      // Silently falling back to the first page would re-serve seen rows and
      // hide the defect behind a plausible-looking list.
      expect(() => decodeCommentCursor('')).toThrow('Invalid comment cursor');
      expect(() => decodeCommentCursor('not-base64!!')).toThrow('Invalid comment cursor');
      expect(() => decodeCommentCursor(Buffer.from('2026-11-06T13:00:03.665Z').toString('base64url')))
        .toThrow('Invalid comment cursor');
      expect(() => decodeCommentCursor(Buffer.from('garbage|6aeee49fbc449064866c6601').toString('base64url')))
        .toThrow('Invalid comment cursor');
      expect(() => decodeCommentCursor(Buffer.from('2026-11-06T13:00:03.665Z|short').toString('base64url')))
        .toThrow('Invalid comment cursor');
    });
  });

  describe('buildCommentCursorFilter', () => {
    const cursor = { createdAt: at('2026-11-06T13:00:00.000Z'), id: id(5) };

    it('selects strictly older rows (or same-timestamp rows with a smaller id) for NEWEST', () => {
      const filter = buildCommentCursorFilter(cursor, 'NEWEST');

      expect(filter).toEqual({
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          // The tie-break branch is what makes the page boundary total.
          { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
        ],
      });
    });

    it('selects strictly newer rows (or same-timestamp rows with a larger id) for OLDEST', () => {
      const filter = buildCommentCursorFilter(cursor, 'OLDEST');

      expect(filter).toEqual({
        $or: [
          { createdAt: { $gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, _id: { $gt: cursor.id } },
        ],
      });
    });
  });
});
