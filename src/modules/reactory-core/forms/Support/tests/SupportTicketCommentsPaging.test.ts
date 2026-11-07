import fs from 'fs';
import path from 'path';

/**
 * REACTORY-302016408/20261107/149192668.
 *
 * The comments panel is a client widget compiled by the module compiler, so it
 * cannot be mounted in this (server) test suite. This is a wiring test: it pins
 * the contract that the paged state machine in `shared/commentPaging` is
 * actually used by the widget — the query asks the server for a page and a
 * cursor, the header shows the server total, and a "load more" affordance is
 * rendered whenever more rows exist.
 *
 * Behaviour (first page / next page / last page / sort switch / tie-break) is
 * covered by `forms/Support/tests/commentPaging.test.ts` and
 * `resolvers/Comment/__tests__/CommentResolver.pagination.test.ts`.
 */
describe('support ticket comments widget — paging wiring', () => {
  const widgetPath = path.resolve(__dirname, '../Widgets/core.SupportTicketComments.tsx');
  const source = fs.readFileSync(widgetPath, 'utf8');

  it('is the widget the ticket identified', () => {
    expect(fs.existsSync(widgetPath)).toBe(true);
    expect(source).toContain("name: 'SupportTicketComments'");
  });

  it('requests a page, a sort direction and a keyset cursor', () => {
    expect(source).toContain('$paging: PagingRequest');
    expect(source).toContain('$sortOrder: CommentSortOrder');
    expect(source).toContain('$cursor: String');
    expect(source).toContain('sortOrder: options.sortOrder');
    expect(source).toContain('cursor: options.cursor');
    // The server's keyset cursor must be read, not just requested.
    expect(source).toContain('nextCursor');
  });

  it('uses the server total and the server hasNext, never the loaded length', () => {
    expect(source).toContain('commentCountLabel(commentList.total)');
    expect(source).toContain('commentShowingLabel(commentList.comments.length, commentList.total)');
    expect(source).toContain('canLoadMoreComments(commentList)');
    // A truncated list must not be able to masquerade as the whole history.
    expect(source).not.toContain('Comments ({commentList.comments.length})');
  });

  it('renders a load-more control that appends the next page', () => {
    expect(source).toContain('onClick={loadMoreComments}');
    expect(source).toContain("type: 'nextPage'");
    // Query sent for the next page carries the cursor forward.
    expect(source).toContain('canLoadMoreComments(current)');
  });

  it('resets paging and refetches when the sort direction changes', () => {
    expect(source).toContain('handleSortChange');
    expect(source).toContain("handleSortChange('NEWEST')");
    expect(source).toContain("handleSortChange('OLDEST')");
    expect(source).toContain("type: 'sortOrderChanged'");
    expect(source).toContain('void loadFirstPage(nextOrder)');
    // Sorting is server-side now: no client-side sort of one page.
    expect(source).not.toContain("sortBy === 'newest'");
  });

  it('pages replies within a thread without resetting the parent page', () => {
    expect(source).toContain('getCommentReplies(commentId: $commentId, paging: $paging, cursor: $cursor');
    expect(source).toContain("loadReplies(comment.id, 'more')");
    expect(source).toContain("type: 'repliesUpdated'");
  });

  it('re-bases the loaded window on external changes instead of collapsing to page 1', () => {
    expect(source).toContain('refreshLoadedWindow');
    expect(source).toContain('MAX_REFRESH_PAGES');
  });
});
