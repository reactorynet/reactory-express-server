/**
 * Client-side state machine for paged comment lists.
 *
 * REACTORY-302016408/20261107/149192668 — the support ticket comments panel
 * fetched a single page and rendered it as if it were the whole conversation.
 *
 * The paging state lives in a pure reducer so the behaviours the ticket cares
 * about (append the next page, reset on a sort change, never duplicate a row
 * that arrives twice) can be asserted without mounting React.
 */

/** Root comments fetched per page by the ticket comments panel. */
export const COMMENT_PAGE_SIZE = 20;

/** Replies fetched per page when a thread is expanded. */
export const REPLY_PAGE_SIZE = 20;

/** Must not exceed the server's `MAX_COMMENT_PAGE_SIZE` (100). */
export const MAX_COMMENT_PAGE_SIZE = 100;

/**
 * Upper bound on pages fetched while re-basing the loaded window after a
 * comment event. 20 pages x 20 rows = 2000 comments, well beyond any ticket in
 * the wild, and bounded so a runaway loop cannot hammer the API.
 */
export const MAX_REFRESH_PAGES = 20;

export type CommentSortOrder = 'NEWEST' | 'OLDEST';

export interface ICommentPagingWindow {
  total: number;
  hasNext: boolean;
  nextCursor: string | null;
}

export interface ICommentListState {
  comments: any[];
  total: number;
  hasNext: boolean;
  nextCursor: string | null;
  sortOrder: CommentSortOrder;
}

export type CommentListAction =
  | {
      type: 'firstPage';
      comments: any[];
      paging: ICommentPagingWindow;
      sortOrder: CommentSortOrder;
    }
  | { type: 'nextPage'; comments: any[]; paging: ICommentPagingWindow }
  | { type: 'sortOrderChanged'; sortOrder: CommentSortOrder }
  | { type: 'repliesUpdated'; commentId: string; replies: any[]; append?: boolean };

export const initialCommentListState = (
  sortOrder: CommentSortOrder = 'NEWEST',
): ICommentListState => ({
  comments: [],
  total: 0,
  hasNext: false,
  nextCursor: null,
  sortOrder,
});

const commentKey = (comment: any): string | null => {
  if (!comment) return null;
  const id = comment.id ?? comment._id;
  return id === undefined || id === null ? null : String(id);
};

/**
 * Appends a page, dropping rows already present. The server may legitimately
 * return an overlap (a comment updated between pages), and a duplicate key in
 * the list makes React reuse the wrong card.
 */
export const mergeCommentPages = (existing: any[], incoming: any[]): any[] => {
  const merged = Array.isArray(existing) ? [...existing] : [];
  const seen = new Set<string>();
  merged.forEach((comment) => {
    const key = commentKey(comment);
    if (key) seen.add(key);
  });

  (Array.isArray(incoming) ? incoming : []).forEach((comment) => {
    const key = commentKey(comment);
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    merged.push(comment);
  });

  return merged;
};

/**
 * Replaces (or appends to) the `replies` of a comment anywhere in the tree.
 * Expanding a thread must not disturb the order of the loaded root page.
 */
export const updateCommentReplies = (
  comments: any[],
  commentId: string,
  replies: any[],
  append: boolean = false,
): any[] =>
  (Array.isArray(comments) ? comments : []).map((comment) => {
    if (!comment) return comment;

    if (String(comment.id ?? comment._id) === String(commentId)) {
      return {
        ...comment,
        replies: append ? mergeCommentPages(comment.replies || [], replies) : replies,
      };
    }

    if (Array.isArray(comment.replies) && comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateCommentReplies(comment.replies, commentId, replies, append),
      };
    }

    return comment;
  });

export const commentListReducer = (
  state: ICommentListState,
  action: CommentListAction,
): ICommentListState => {
  switch (action.type) {
    case 'firstPage':
      return {
        comments: action.comments || [],
        total: action.paging.total,
        hasNext: Boolean(action.paging.hasNext),
        nextCursor: action.paging.nextCursor || null,
        sortOrder: action.sortOrder,
      };

    case 'nextPage':
      return {
        ...state,
        comments: mergeCommentPages(state.comments, action.comments),
        total: action.paging.total,
        hasNext: Boolean(action.paging.hasNext),
        nextCursor: action.paging.nextCursor || null,
      };

    case 'sortOrderChanged':
      // A new direction invalidates the cursor chain: the list must be
      // refetched from page 1. Reversing the loaded page in place would leave
      // a hole in the middle of the set (newest 20 reversed is not oldest 20).
      return initialCommentListState(action.sortOrder);

    case 'repliesUpdated':
      return {
        ...state,
        comments: updateCommentReplies(state.comments, action.commentId, action.replies, action.append),
      };

    default:
      return state;
  }
};

/** True only when the window can actually be continued (cursor + flag). */
export const canLoadMoreComments = (
  window: Partial<ICommentPagingWindow> | null | undefined,
): boolean => Boolean(window && window.hasNext && window.nextCursor);

/** Header count: always the server total, never the loaded length. */
export const commentCountLabel = (total: number): string =>
  `Comments (${Math.max(0, Math.floor(Number(total) || 0))})`;

/**
 * Explicit "more exists" affordance. A truncated list must never be presented
 * as complete, so this is rendered whenever something is loaded.
 */
export const commentShowingLabel = (loaded: number, total: number): string => {
  const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
  const safeLoaded = Math.max(0, Math.floor(Number(loaded) || 0));

  if (safeTotal > 0 && safeLoaded >= safeTotal) {
    return `Showing all ${safeTotal} comment${safeTotal === 1 ? '' : 's'}`;
  }

  return `Showing ${safeLoaded} of ${safeTotal}`;
};
