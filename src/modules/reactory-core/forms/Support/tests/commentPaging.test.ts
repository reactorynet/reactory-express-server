import {
  COMMENT_PAGE_SIZE,
  MAX_COMMENT_PAGE_SIZE,
  canLoadMoreComments,
  commentCountLabel,
  commentListReducer,
  commentShowingLabel,
  initialCommentListState,
  mergeCommentPages,
  updateCommentReplies,
} from '../shared/commentPaging';

/**
 * REACTORY-302016408/20261107/149192668.
 *
 * The support ticket comments panel offered a sort order but no paging, so any
 * comment past the first page was unreachable and the truncated list was shown
 * as if it were complete. These tests drive the paging state machine that the
 * panel now uses, without mounting React:
 *
 *  - first page replaces the list and carries the true server total;
 *  - "load more" appends the next page, never duplicating a row;
 *  - the last page reports `hasNext: false`, which hides the control;
 *  - switching sort resets to page 1 (it must not reverse the loaded page);
 *  - expanding a thread changes only that thread's replies.
 */
describe('comment paging state machine', () => {
  const comment = (id: string) => ({ id, text: `comment ${id}`, when: '2026-11-06T13:00:00.000Z' });
  const rows = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, index) => comment(`c${from + index}`));
  const parent = (id: string, replies: any[] = []) => ({ id, text: id, replies });
  const firstPage = (comments: any[], total: number, nextCursor: string | null = 'cursor-1') =>
    commentListReducer(initialCommentListState('NEWEST'), {
      type: 'firstPage',
      comments,
      paging: { total, hasNext: Boolean(nextCursor), nextCursor },
      sortOrder: 'NEWEST',
    });

  it('uses the page size the server was asked for', () => {
    expect(COMMENT_PAGE_SIZE).toBe(20);
    // The client must never ask for more than the server will honour.
    expect(COMMENT_PAGE_SIZE).toBeLessThanOrEqual(MAX_COMMENT_PAGE_SIZE);
  });

  describe('first page', () => {
    it('holds exactly one page but reports the full total', () => {
      const state = firstPage(rows(1, 20), 42);

      expect(state.comments).toHaveLength(20);
      // Header count comes from the server total, not the loaded length.
      expect(state.total).toBe(42);
      expect(commentCountLabel(state.total)).toBe('Comments (42)');
      // Truncation is visible: never "20" presented as the whole history.
      expect(commentShowingLabel(state.comments.length, state.total)).toBe('Showing 20 of 42');
    });

    it('offers load-more while more rows exist', () => {
      const state = firstPage(rows(1, 20), 42);
      expect(canLoadMoreComments(state)).toBe(true);
    });
  });

  describe('next page', () => {
    it('appends the next page in order', () => {
      const afterFirst = firstPage(rows(1, 20), 42);
      const afterSecond = commentListReducer(afterFirst, {
        type: 'nextPage',
        comments: rows(21, 40),
        paging: { total: 42, hasNext: true, nextCursor: 'cursor-2' },
      });

      expect(afterSecond.comments).toHaveLength(40);
      expect(afterSecond.comments[20].id).toBe('c21');
      expect(afterSecond.comments[39].id).toBe('c40');
      expect(canLoadMoreComments(afterSecond)).toBe(true);
    });

    it('does not duplicate rows that overlap the previous page', () => {
      // A comment inserted while the reader pages can legitimately appear in
      // both windows; the list must keep one card per comment.
      const afterFirst = firstPage(rows(1, 20), 42);
      const afterSecond = commentListReducer(afterFirst, {
        type: 'nextPage',
        comments: rows(18, 30),
        paging: { total: 42, hasNext: true, nextCursor: 'cursor-2' },
      });

      const ids = afterSecond.comments.map((entry) => entry.id);
      expect(ids).toHaveLength(new Set(ids).size);
      expect(ids).toEqual(Array.from({ length: 30 }, (_, index) => `c${index + 1}`));
    });

    it('last page: hasNext false and no cursor, so the control disappears', () => {
      const afterFirst = firstPage(rows(1, 20), 42);
      const afterLast = commentListReducer(afterFirst, {
        type: 'nextPage',
        comments: rows(21, 42),
        paging: { total: 42, hasNext: false, nextCursor: null },
      });

      expect(afterLast.comments).toHaveLength(42);
      expect(canLoadMoreComments(afterLast)).toBe(false);
      // Every comment is on screen and the UI says so.
      expect(commentShowingLabel(afterLast.comments.length, afterLast.total)).toBe('Showing all 42 comments');
    });
  });

  describe('sort switch', () => {
    it('resets the loaded pages instead of reversing the current page', () => {
      const afterFirst = firstPage(rows(1, 20), 42);
      const afterSecond = commentListReducer(afterFirst, {
        type: 'nextPage',
        comments: rows(21, 40),
        paging: { total: 42, hasNext: true, nextCursor: 'cursor-2' },
      });

      const switched = commentListReducer(afterSecond, { type: 'sortOrderChanged', sortOrder: 'OLDEST' });

      // No rows carried over: reversing the newest 40 in place would show the
      // oldest *loaded* row, not the oldest row in the set — a hole in the middle.
      expect(switched.comments).toEqual([]);
      expect(switched.total).toBe(0);
      expect(switched.hasNext).toBe(false);
      expect(switched.nextCursor).toBeNull();
      expect(switched.sortOrder).toBe('OLDEST');
      expect(canLoadMoreComments(switched)).toBe(false);
    });

    it('accepts the first page of the new direction as page 1', () => {
      const switched = commentListReducer(firstPage(rows(1, 20), 42), {
        type: 'sortOrderChanged',
        sortOrder: 'OLDEST',
      });
      const oldestFirst = commentListReducer(switched, {
        type: 'firstPage',
        comments: rows(1, 20),
        paging: { total: 42, hasNext: true, nextCursor: 'cursor-oldest-1' },
        sortOrder: 'OLDEST',
      });

      expect(oldestFirst.comments[0].id).toBe('c1');
      expect(oldestFirst.sortOrder).toBe('OLDEST');
      expect(oldestFirst.total).toBe(42);
    });
  });

  describe('replies', () => {
    it('replaces only the expanded thread and leaves the parent page order intact', () => {
      const state = firstPage([parent('p1'), parent('p2'), parent('p3')], 3, null);

      const updated = commentListReducer(state, {
        type: 'repliesUpdated',
        commentId: 'p2',
        replies: [comment('r1'), comment('r2')],
      });

      expect(updated.comments.map((entry) => entry.id)).toEqual(['p1', 'p2', 'p3']);
      expect(updated.comments[1].replies.map((entry: any) => entry.id)).toEqual(['r1', 'r2']);
      expect(updated.comments[0].replies).toEqual([]);
    });

    it('appends more replies without duplicating the first page', () => {
      let state = firstPage([parent('p1')], 1, null);
      state = commentListReducer(state, {
        type: 'repliesUpdated',
        commentId: 'p1',
        replies: [comment('r1'), comment('r2')],
      });
      state = commentListReducer(state, {
        type: 'repliesUpdated',
        commentId: 'p1',
        replies: [comment('r2'), comment('r3')],
        append: true,
      });

      expect(state.comments[0].replies.map((entry: any) => entry.id)).toEqual(['r1', 'r2', 'r3']);
    });

    it('finds a nested reply thread recursively', () => {
      const state = firstPage([parent('p1', [parent('r1', [])])], 1, null);
      const updated = commentListReducer(state, {
        type: 'repliesUpdated',
        commentId: 'r1',
        replies: [comment('r1a')],
      });

      expect(updated.comments[0].replies[0].replies.map((entry: any) => entry.id)).toEqual(['r1a']);
    });
  });

  describe('mergeCommentPages', () => {
    it('keeps existing order and appends only unseen rows', () => {
      const merged = mergeCommentPages([comment('a'), comment('b')], [comment('b'), comment('c')]);
      expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    });

    it('tolerates rows without an id instead of collapsing them', () => {
      const merged = mergeCommentPages([{ text: 'no id' }], [{ text: 'also no id' }]);
      expect(merged).toHaveLength(2);
    });

    it('is a no-op for an absent page', () => {
      expect(mergeCommentPages([comment('a')], undefined as any)).toHaveLength(1);
    });
  });

  describe('updateCommentReplies', () => {
    it('does not mutate the input tree', () => {
      const original = [parent('p1')];
      const updated = updateCommentReplies(original, 'p1', [comment('r1')]);

      expect(original[0].replies).toEqual([]);
      expect(updated[0].replies).toHaveLength(1);
      expect(updated).not.toBe(original);
    });
  });

  describe('labels', () => {
    it('shows a truthful count when nothing is loaded yet', () => {
      expect(commentCountLabel(0)).toBe('Comments (0)');
      expect(commentShowingLabel(0, 0)).toBe('Showing 0 of 0');
    });

    it('singularises a single comment', () => {
      expect(commentShowingLabel(1, 1)).toBe('Showing all 1 comment');
    });

    it('guards against nonsense totals from a failed query', () => {
      expect(commentCountLabel(Number.NaN)).toBe('Comments (0)');
      expect(commentShowingLabel(Number.NaN, Number.NaN)).toBe('Showing 0 of 0');
    });
  });

  describe('canLoadMoreComments', () => {
    it('requires both the flag and a cursor, so a load-more cannot loop on page 1', () => {
      expect(canLoadMoreComments({ hasNext: true, nextCursor: 'c' })).toBe(true);
      expect(canLoadMoreComments({ hasNext: true, nextCursor: null })).toBe(false);
      expect(canLoadMoreComments({ hasNext: false, nextCursor: 'c' })).toBe(false);
      expect(canLoadMoreComments(undefined)).toBe(false);
    });
  });
});
