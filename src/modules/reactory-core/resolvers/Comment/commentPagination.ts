import { ObjectId } from 'mongodb';

/**
 * Cursor (keyset) pagination helpers for the Comment resolvers.
 *
 * REACTORY-302016408/20261107/149192668 — the support ticket comments panel
 * fetched only the first page and rendered it as if it were the whole set.
 *
 * Pagination is keyset on `(createdAt, _id)` rather than `skip/limit`, because
 * comments are appended while the panel is open: an offset page walks a moving
 * window, so a comment inserted above the cursor duplicates or skips rows.
 * `createdAt` alone is not a total order — support comments routinely share a
 * timestamp — so `_id` is the tie-break, in the same direction as `createdAt`.
 */

/** Default page size for root comments (preserves the previous default). */
export const DEFAULT_COMMENT_PAGE_SIZE = 20;

/** Default page size for replies (preserves the previous default). */
export const DEFAULT_REPLY_PAGE_SIZE = 50;

/**
 * Hard ceiling the server will honour. A client cannot ask for an unbounded
 * page: any larger `pageSize` is clamped down to this.
 */
export const MAX_COMMENT_PAGE_SIZE = 100;

export type CommentSortOrder = 'NEWEST' | 'OLDEST';

export interface ICommentCursor {
  createdAt: Date;
  id: ObjectId;
}

export interface ICommentPageWindow {
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  nextCursor: string | null;
}

const CURSOR_SEPARATOR = '|';
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

/**
 * Normalises the GraphQL `sortOrder` argument. Unknown/absent values fall back
 * to the caller's historical default so existing queries keep their ordering.
 */
export const resolveCommentSortOrder = (
  value: unknown,
  fallback: CommentSortOrder = 'NEWEST',
): CommentSortOrder => (value === 'NEWEST' || value === 'OLDEST' ? value : fallback);

/**
 * Clamps a requested page size into `[1, MAX_COMMENT_PAGE_SIZE]`.
 * Non-numeric, zero, negative and absurd values are ignored in favour of the
 * default rather than producing a zero-row page.
 */
export const clampCommentPageSize = (
  requested?: number | null,
  fallback: number = DEFAULT_COMMENT_PAGE_SIZE,
): number => {
  const numeric = typeof requested === 'number' ? requested : NaN;
  const candidate = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
  return Math.min(Math.max(1, candidate), MAX_COMMENT_PAGE_SIZE);
};

/**
 * Total ordering used for both the Mongo sort and the cursor comparison.
 * The direction of `_id` must match `createdAt`, otherwise two comments in the
 * same millisecond would be ordered inconsistently between pages.
 */
export const commentSortSpec = (order: CommentSortOrder): Record<string, 1 | -1> => {
  const direction: 1 | -1 = order === 'OLDEST' ? 1 : -1;
  return { createdAt: direction, _id: direction };
};

/**
 * Encodes the last row of a page as an opaque cursor. Returns `null` when the
 * row carries no usable identity (defensive: a page with `hasNext` must always
 * be able to produce a cursor).
 */
export const encodeCommentCursor = (
  row: { createdAt?: Date | string; _id?: any; id?: any } | null | undefined,
): string | null => {
  if (!row) return null;

  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt as any);
  if (Number.isNaN(createdAt.getTime())) return null;

  const rawId = row._id ?? row.id;
  if (!rawId) return null;
  const id = typeof rawId === 'string' ? rawId : String(rawId);
  if (!OBJECT_ID_PATTERN.test(id)) return null;

  return Buffer.from(`${createdAt.toISOString()}${CURSOR_SEPARATOR}${id}`, 'utf8').toString('base64url');
};

/**
 * Decodes a cursor previously produced by {@link encodeCommentCursor}.
 * Throws on malformed input: silently treating a bad cursor as "first page"
 * would re-serve rows the reader has already seen and hide the bug.
 */
export const decodeCommentCursor = (cursor: string): ICommentCursor => {
  const invalid = (): never => {
    throw new Error('Invalid comment cursor');
  };

  if (typeof cursor !== 'string' || cursor.length === 0) return invalid();

  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch (error) {
    return invalid();
  }

  const separator = decoded.indexOf(CURSOR_SEPARATOR);
  if (separator <= 0) return invalid();

  const createdAt = new Date(decoded.slice(0, separator));
  const id = decoded.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || !OBJECT_ID_PATTERN.test(id)) return invalid();

  return { createdAt, id: new ObjectId(id) };
};

/**
 * Keyset predicate for "everything strictly after `cursor`" in the given
 * direction. Must be combined with the base filter via `$and` so its `$or`
 * cannot collide with a base filter that already uses `$or`.
 */
export const buildCommentCursorFilter = (
  cursor: ICommentCursor,
  order: CommentSortOrder,
): Record<string, any> => {
  const comparison = order === 'OLDEST' ? '$gt' : '$lt';
  return {
    $or: [
      { createdAt: { [comparison]: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { [comparison]: cursor.id } },
    ],
  };
};
