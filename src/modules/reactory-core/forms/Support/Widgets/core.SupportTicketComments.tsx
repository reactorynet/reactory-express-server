import Reactory from '@reactorynet/reactory-core';
import {
  COMMENT_PAGE_SIZE,
  MAX_REFRESH_PAGES,
  REPLY_PAGE_SIZE,
  canLoadMoreComments,
  commentCountLabel,
  commentListReducer,
  commentShowingLabel,
  initialCommentListState,
  mergeCommentPages,
} from '../shared/commentPaging';
import type { CommentSortOrder, ICommentListState } from '../shared/commentPaging';

/**
 * Paging metadata for one comment's reply thread. `loaded` is how many replies
 * the reader has fetched; a refresh re-bases the same window instead of
 * collapsing the thread back to its first page.
 */
interface IReplyWindow {
  total: number;
  hasNext: boolean;
  nextCursor: string | null;
  loaded: number;
}

interface CommentsDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  UserAvatar: any,
  RelativeTime: any,
  useContentRender: any,
  RichEditorWidget: any,
}

interface CommentsProps {
  reactory: Reactory.Client.IReactoryApi,
  ticket: Reactory.Models.IReactorySupportTicket,
  /**
   * Reports the current total number of comments so a parent (e.g. the ticket
   * detail panel tab badge) can stay in sync without refetching the ticket.
   */
  onCommentCountChange?: (count: number) => void,
}

/**
 * SupportTicketComments Component
 * 
 * Comments tab with rich text editor for adding comments and threaded display.
 * 
 * Features:
 * - Rich text editor for new comments
 * - Threaded comment display
 * - User avatars and timestamps
 * - Edit/delete own comments
 * - Like/reaction system (future)
 * - @mentions support (future)
 * 
 * @example
 * <SupportTicketComments ticket={ticketData} reactory={api} />
 */
const SupportTicketComments = (props: CommentsProps) => {
  const { reactory, ticket, onCommentCountChange } = props;

  if (!ticket) {
    return <div>No ticket data available</div>;
  }

  const { 
    React, 
    Material,
    UserAvatar,
    RelativeTime,
    useContentRender,
    RichEditorWidget,
  } = reactory.getComponents<CommentsDependencies>([
    'react.React',
    'material-ui.Material',
    'core.UserAvatar',
    'core.RelativeTime',
    'core.useContentRender',
    'core.RichEditorWidget',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Paper,
    Divider,
    Button,
    Icon,
    IconButton,
    Tooltip,
    TextField,
    Card,
    CardContent,
    CardActions,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Collapse,
    Chip,
  } = MaterialCore;

  const [commentText, setCommentText] = React.useState('');
  // Incrementing this key remounts the rich text editor. The editor is a Quill
  // instance which does not clear its own DOM when the bound `formData` prop is
  // reset to '', so a successful post previously left the text visible and the
  // user could re-submit it (duplicate comments).
  const [composerKey, setComposerKey] = React.useState(0);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState('');
  // Root comments and their paging window. The reducer owns the loaded pages so
  // appending a page, switching sort and merging replies are all pure and
  // testable (see forms/Support/tests/commentPaging.test.ts).
  const [commentList, dispatchCommentList] = React.useReducer(
    commentListReducer,
    initialCommentListState('NEWEST'),
  );
  // Refs mirror async-relevant state so handlers read the window they were
  // invoked with instead of a stale render closure.
  const commentListRef = React.useRef<ICommentListState>(commentList);
  const expandedRepliesRef = React.useRef<Set<string>>(new Set());
  const replyPagingRef = React.useRef<Record<string, IReplyWindow>>({});
  const onCommentCountChangeRef = React.useRef(onCommentCountChange);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [commentToDelete, setCommentToDelete] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [expandedReplies, setExpandedReplies] = React.useState<Set<string>>(new Set());
  const [replyPaging, setReplyPaging] = React.useState<Record<string, IReplyWindow>>({});
  const [loadingReplies, setLoadingReplies] = React.useState<Set<string>>(new Set());

  React.useEffect(() => { commentListRef.current = commentList; }, [commentList]);
  React.useEffect(() => { expandedRepliesRef.current = expandedReplies; }, [expandedReplies]);
  React.useEffect(() => { replyPagingRef.current = replyPaging; }, [replyPaging]);
  React.useEffect(() => { onCommentCountChangeRef.current = onCommentCountChange; });

  const publishCommentCount = React.useCallback((total: number) => {
    const handler = onCommentCountChangeRef.current;
    if (typeof handler === 'function') handler(total);
  }, []);

  // Initialize content renderer
  const { renderContent } = useContentRender ? useContentRender(reactory) : { 
    renderContent: (content: string) => content 
  };

  // Get current user
  const currentUser = reactory.getUser();
  const userId = currentUser?.loggedIn?.user?.id;

  // Fetch comments for this ticket
  /**
   * Publish the canonical change event so the MaterialTableWidget grid (Comments column)
   * and any other subscriber can refresh after this component mutates the ticket.
   */
  const notifyTicketChanged = React.useCallback((action: string, changes?: any) => {
    try {
      reactory.emit('core.SupportTicketChanged', {
        action,
        ticketId: ticket?.id,
        reference: ticket?.reference,
        ticket,
        changes,
      });
    } catch (emitError) {
      reactory.log('SupportTicketComments: failed to emit core.SupportTicketChanged', { emitError }, 'warn');
    }
  }, [reactory, ticket]);

  /**
   * Fetch one page of root comments. `cursor` is the opaque keyset cursor the
   * server returned for the previous page; `page` is only meaningful for the
   * first page (and for offset callers) because the server prefers the cursor.
   */
  const fetchCommentPage = React.useCallback(async (options: {
    cursor?: string | null;
    page?: number;
    sortOrder: CommentSortOrder;
  }): Promise<{ comments: any[]; total: number; hasNext: boolean; nextCursor: string | null } | null> => {
    if (!ticket?.id) return null;

    try {
      const result = await reactory.graphqlQuery(`
        query GetCommentsByContext(
          $context: String!
          $contextId: String!
          $paging: PagingRequest
          $sortOrder: CommentSortOrder
          $cursor: String
        ) {
          getCommentsByContext(
            context: $context
            contextId: $contextId
            paging: $paging
            sortOrder: $sortOrder
            cursor: $cursor
          ) {
            comments {
              id
              text
              when
              who {
                id
                firstName
                lastName
                avatar
                email
              }
              upvotes
              downvotes
              favorites
              removed
              parentId
              replies {
                id
                text
                when
                who {
                  id
                  firstName
                  lastName
                  avatar
                }
                upvotes
                parentId
              }
            }
            paging {
              page
              pageSize
              total
              hasNext
              nextCursor
            }
          }
        }
      `, {
        context: 'ReactorySupportTicket',
        contextId: ticket.id,
        paging: { page: options.page || 1, pageSize: COMMENT_PAGE_SIZE },
        sortOrder: options.sortOrder,
        ...(options.cursor ? { cursor: options.cursor } : {}),
      });

      const payload = result.data?.getCommentsByContext;
      if (!payload) return null;

      const list = Array.isArray(payload.comments) ? payload.comments : [];
      const paging = payload.paging || {};
      const total = typeof paging.total === 'number' ? paging.total : list.length;

      return {
        comments: list,
        total,
        hasNext: Boolean(paging.hasNext),
        nextCursor: paging.nextCursor || null,
      };
    } catch (error) {
      reactory.log('Error fetching comments', { error }, 'error');
      reactory.createNotification('Failed to load comments', {
        title: 'Error',
        options: { body: 'Could not load comments for this ticket' }
      });
      return null;
    }
  }, [ticket?.id, reactory]);

  /** Replace the list with the first page in the given direction. */
  const loadFirstPage = React.useCallback(async (sortOrder: CommentSortOrder): Promise<any[]> => {
    setLoading(true);
    try {
      const page = await fetchCommentPage({ page: 1, sortOrder });
      if (!page) return [];

      dispatchCommentList({
        type: 'firstPage',
        comments: page.comments,
        paging: page,
        sortOrder,
      });
      publishCommentCount(page.total);
      return page.comments;
    } finally {
      setLoading(false);
    }
  }, [fetchCommentPage, publishCommentCount]);

  /** Append the next page in the currently selected direction. */
  const loadMoreComments = React.useCallback(async () => {
    const current = commentListRef.current;
    if (!canLoadMoreComments(current) || loadingMore) return;

    setLoadingMore(true);
    try {
      const next = await fetchCommentPage({
        cursor: current.nextCursor,
        page: 1,
        sortOrder: current.sortOrder,
      });
      if (!next) return;

      dispatchCommentList({ type: 'nextPage', comments: next.comments, paging: next });
      publishCommentCount(next.total);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchCommentPage, loadingMore, publishCommentCount]);

  /**
   * Re-base the loaded window after an external change. Walks the same keyset
   * chain the reader built, so an appended comment does not collapse the panel
   * back to page 1 (nor duplicate rows already on screen).
   */
  const refreshLoadedWindow = React.useCallback(async () => {
    const current = commentListRef.current;
    const target = Math.max(current.comments.length, COMMENT_PAGE_SIZE);

    let collected: any[] = [];
    let cursor: string | null = null;
    let last: { comments: any[]; total: number; hasNext: boolean; nextCursor: string | null } = {
      comments: [],
      total: current.total,
      hasNext: false,
      nextCursor: null,
    };

    for (let pageNumber = 1; pageNumber <= MAX_REFRESH_PAGES; pageNumber += 1) {
      const page = await fetchCommentPage({ page: pageNumber, cursor, sortOrder: current.sortOrder });
      if (!page) return;

      collected = mergeCommentPages(collected, page.comments);
      last = page;
      cursor = page.nextCursor;

      if (!page.hasNext || !cursor || collected.length >= target) break;
    }

    dispatchCommentList({
      type: 'firstPage',
      comments: collected,
      paging: last,
      sortOrder: current.sortOrder,
    });
    publishCommentCount(last.total);
  }, [fetchCommentPage, publishCommentCount]);

  /** Fetch one page of a comment's replies (chronological order). */
  const fetchReplyPage = React.useCallback(async (commentId: string, options: {
    cursor?: string | null;
    page?: number;
  }): Promise<{ comments: any[]; total: number; hasNext: boolean; nextCursor: string | null } | null> => {
    try {
      const result = await reactory.graphqlQuery(`
        query GetCommentReplies($commentId: ObjID!, $paging: PagingRequest, $cursor: String) {
          getCommentReplies(commentId: $commentId, paging: $paging, cursor: $cursor, sortOrder: OLDEST) {
            comments {
              id
              text
              when
              who {
                id
                firstName
                lastName
                avatar
                email
              }
              upvotes
              downvotes
              favorites
              removed
              parentId
            }
            paging {
              page
              pageSize
              total
              hasNext
              nextCursor
            }
          }
        }
      `, {
        commentId,
        paging: { page: options.page || 1, pageSize: REPLY_PAGE_SIZE },
        ...(options.cursor ? { cursor: options.cursor } : {}),
      });

      const payload = result.data?.getCommentReplies;
      if (!payload) return null;

      const list = Array.isArray(payload.comments) ? payload.comments : [];
      const paging = payload.paging || {};

      return {
        comments: list,
        total: typeof paging.total === 'number' ? paging.total : list.length,
        hasNext: Boolean(paging.hasNext),
        nextCursor: paging.nextCursor || null,
      };
    } catch (error) {
      reactory.log('Error fetching replies', { error, commentId }, 'error');
      return null;
    }
  }, [reactory]);

  /**
   * Load replies for one comment, either from the start (`reset`, used when a
   * thread is expanded) or the next page (`more`). Only the replies of that
   * comment are touched: the parent page and its order are left intact.
   */
  const loadReplies = React.useCallback(async (commentId: string, mode: 'reset' | 'more' = 'reset') => {
    const current = replyPagingRef.current[commentId];
    if (mode === 'more' && !canLoadMoreComments(current)) return;

    setLoadingReplies((previous) => {
      const next = new Set(previous);
      next.add(commentId);
      return next;
    });

    try {
      const page = await fetchReplyPage(commentId, mode === 'more'
        ? { cursor: current?.nextCursor, page: 1 }
        : { page: 1 });
      if (!page) return;

      dispatchCommentList({
        type: 'repliesUpdated',
        commentId,
        replies: page.comments,
        append: mode === 'more',
      });

      setReplyPaging((previous) => ({
        ...previous,
        [commentId]: {
          total: page.total,
          hasNext: page.hasNext,
          nextCursor: page.nextCursor,
          loaded: mode === 'more'
            ? (previous[commentId]?.loaded || 0) + page.comments.length
            : page.comments.length,
        },
      }));
    } finally {
      setLoadingReplies((previous) => {
        const next = new Set(previous);
        next.delete(commentId);
        return next;
      });
    }
  }, [fetchReplyPage]);

  /** Re-base a reply thread to the number of replies the reader had loaded. */
  const reloadReplyWindow = React.useCallback(async (commentId: string) => {
    const target = Math.max(replyPagingRef.current[commentId]?.loaded || 0, REPLY_PAGE_SIZE);

    let collected: any[] = [];
    let cursor: string | null = null;
    let last: { comments: any[]; total: number; hasNext: boolean; nextCursor: string | null } = {
      comments: [],
      total: 0,
      hasNext: false,
      nextCursor: null,
    };

    for (let pageNumber = 1; pageNumber <= MAX_REFRESH_PAGES; pageNumber += 1) {
      const page = await fetchReplyPage(commentId, { page: pageNumber, cursor });
      if (!page) return;

      collected = mergeCommentPages(collected, page.comments);
      last = page;
      cursor = page.nextCursor;

      if (!page.hasNext || !cursor || collected.length >= target) break;
    }

    dispatchCommentList({
      type: 'repliesUpdated',
      commentId,
      replies: collected,
      append: false,
    });
    setReplyPaging((previous) => ({
      ...previous,
      [commentId]: {
        total: last.total,
        hasNext: last.hasNext,
        nextCursor: last.nextCursor,
        loaded: collected.length,
      },
    }));
  }, [fetchReplyPage]);

  /**
   * Restore expanded reply threads after the root window is re-fetched. Each
   * thread is re-based to the number of replies the reader had loaded, and the
   * parent list is left untouched.
   */
  const restoreExpandedStates = React.useCallback(async () => {
    const expandedIds = Array.from(expandedRepliesRef.current);
    if (expandedIds.length === 0) return;

    const findCommentInTree = (commentsList: any[], targetId: string): any => {
      for (const comment of commentsList) {
        if (String(comment.id ?? comment._id) === targetId) return comment;
        if (comment.replies && comment.replies.length > 0) {
          const found = findCommentInTree(comment.replies, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const tree = commentListRef.current.comments;

    for (const commentId of expandedIds) {
      if (!findCommentInTree(tree, commentId)) continue;
      await reloadReplyWindow(commentId);
    }
  }, [reloadReplyWindow]);

  // Load comments on mount and whenever the ticket changes.
  React.useEffect(() => {
    dispatchCommentList({ type: 'sortOrderChanged', sortOrder: 'NEWEST' });
    void loadFirstPage('NEWEST');
  }, [ticket.id, loadFirstPage]);

  // Listen for comment updates. The loaded window is re-based in place: a new
  // comment must not drop the pages the reader already pulled in.
  React.useEffect(() => {
    const handleUpdate = async (event: any) => {
      if (event.ticketId === ticket.id) {
        await refreshLoadedWindow();
        await restoreExpandedStates();
      }
    };

    // Subscribe to the canonical change event, plus the legacy name for compatibility.
    reactory.on('core.SupportTicketChanged', handleUpdate);
    reactory.on('core.SupportTicketUpdated', handleUpdate);

    return () => {
      reactory.off('core.SupportTicketChanged', handleUpdate);
      reactory.off('core.SupportTicketUpdated', handleUpdate);
    };
  }, [ticket.id, refreshLoadedWindow, restoreExpandedStates, reactory]);

  /** Change the sort direction: reset paging, then refetch page 1 server-side. */
  const handleSortChange = (nextOrder: CommentSortOrder) => {
    if (nextOrder === commentList.sortOrder) return;
    dispatchCommentList({ type: 'sortOrderChanged', sortOrder: nextOrder });
    void loadFirstPage(nextOrder);
  };

  // Toggle reply expansion
  const toggleReplies = async (commentId: string) => {
    const isExpanded = expandedReplies.has(commentId);
    
    if (isExpanded) {
      // Collapse
      setExpandedReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    } else {
      // Expand and fetch the first page of replies
      setExpandedReplies(prev => new Set(prev).add(commentId));
      await loadReplies(commentId, 'reset');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      reactory.createNotification('Comment cannot be empty', { 
        title: 'Comment cannot be empty',
        options: { body: 'Please enter a comment before submitting' }
      });
      return;
    }

    try {
      // Call mutation to add comment
      const result = await reactory.graphqlMutation(`
        mutation AddSupportTicketComment($input: ReactorySupportTicketCommentInput!) {
          ReactoryAddSupportTicketComment(input: $input) {
            id
            text
            when
            who {
              id
              firstName
              lastName
              avatar
              email
            }
          }
        }
      `, {
        input: {
          ticketId: ticket.id,
          comment: commentText,
          parentId: replyingToId,
        }
      });

      if (result.data?.ReactoryAddSupportTicketComment) {
        reactory.createNotification('Comment added successfully', { 
          title: 'Comment Added',
          options: { body: 'Your comment has been added to the ticket' }
        });
        setCommentText('');
        setReplyingToId(null);
        setComposerKey((key) => key + 1);
        // Re-base the loaded window and restore expanded states
        await refreshLoadedWindow();
        notifyTicketChanged('commented', { comment: 'added' });
        await restoreExpandedStates();
      }
    } catch (error) {
      reactory.log('Error adding comment', { error }, 'error');
      reactory.createNotification('Failed to add comment', { 
        title: 'Error',
        options: { body: error.message || 'An error occurred while adding the comment' }
      });
    }
  };

  const handleEditComment = async (commentId: string, currentText: string) => {
    // Set editing mode
    setEditingId(commentId);
    setCommentText(currentText);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!commentText.trim()) {
      reactory.createNotification('Comment cannot be empty', { 
        title: 'Error',
        options: { body: 'Please enter text for the comment' }
      });
      return;
    }

    try {
      const result = await reactory.graphqlMutation(`
        mutation EditComment($input: EditCommentInput!) {
          editComment(input: $input) {
            id
            text
            when
            who {
              id
              firstName
              lastName
              avatar
            }
          }
        }
      `, {
        input: {
          commentId,
          text: commentText,
        }
      });

      if (result.data?.editComment) {
        reactory.createNotification('Comment updated', {
          title: 'Success',
          options: { body: 'Your comment has been updated' }
        });
        
        setEditingId(null);
        setCommentText('');
        
        // Re-base the loaded window and restore expanded states
        await refreshLoadedWindow();
        notifyTicketChanged('commented', { comment: 'updated' });
        await restoreExpandedStates();
      }
    } catch (error) {
      reactory.log('Error editing comment', { error }, 'error');
      reactory.createNotification('Failed to edit comment', {
        title: 'Error',
        options: { body: error.message || 'An error occurred while editing the comment' }
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCommentText('');
    setComposerKey((key) => key + 1);
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;

    try {
      const result = await reactory.graphqlMutation(`
        mutation DeleteComment($input: DeleteCommentInput!) {
          deleteComment(input: $input) {
            ... on DeleteCommentSuccess {
              success
              message
              commentId
            }
            ... on DeleteCommentError {
              error
              message
              commentId
            }
          }
        }
      `, {
        input: {
          commentId: commentToDelete,
          softDelete: true,
        }
      });

      const deleteResult = result.data?.deleteComment;
      
      if (deleteResult?.__typename === 'DeleteCommentSuccess') {
        reactory.createNotification('Comment deleted', {
          title: 'Success',
          options: { body: deleteResult.message || 'Comment has been removed' }
        });
        
        // Re-base the loaded window and restore expanded states
        await refreshLoadedWindow();
        notifyTicketChanged('commented', { comment: 'deleted' });
        await restoreExpandedStates();
      } else {
        throw new Error(deleteResult?.message || 'Delete failed');
      }
    } catch (error) {
      reactory.log('Error deleting comment', { error }, 'error');
      reactory.createNotification('Failed to delete comment', {
        title: 'Error',
        options: { body: error.message || 'An error occurred while deleting the comment' }
      });
    } finally {
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setCommentToDelete(null);
  };

  const handleUpvote = async (commentId: string) => {
    try {
      const result = await reactory.graphqlMutation(`
        mutation UpvoteComment($commentId: ObjID!) {
          upvoteComment(commentId: $commentId) {
            id
            upvotes
            downvotes
          }
        }
      `, {
        commentId,
      });

      if (result.data?.upvoteComment) {
        // Re-base the loaded window and restore expanded states
        await refreshLoadedWindow();
        notifyTicketChanged('commented', { comment: 'upvoted' });
        await restoreExpandedStates();
      }
    } catch (error) {
      reactory.log('Error upvoting comment', { error }, 'error');
      reactory.createNotification('Failed to upvote comment', {
        title: 'Error',
        options: { body: error.message }
      });
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingToId(replyingToId === commentId ? null : commentId);
    setReplyText('');
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyText.trim()) {
      reactory.createNotification('Reply cannot be empty', { 
        title: 'Reply cannot be empty',
        options: { body: 'Please enter a reply before submitting' }
      });
      return;
    }

    try {
      // Call mutation to add reply (comment with parentId)
      const result = await reactory.graphqlMutation(`
        mutation AddSupportTicketComment($input: ReactorySupportTicketCommentInput!) {
          ReactoryAddSupportTicketComment(input: $input) {
            id
            text
            when
            who {
              id
              firstName
              lastName
              avatar
              email
            }
          }
        }
      `, {
        input: {
          ticketId: ticket.id,
          comment: replyText,
          parentId: parentCommentId,
        }
      });

      if (result.data?.ReactoryAddSupportTicketComment) {
        reactory.createNotification('Reply added successfully', { 
          title: 'Reply Added',
          options: { body: 'Your reply has been added to the comment' }
        });
        
        // Ensure the parent comment is in the expanded set
        setExpandedReplies(prev => new Set(prev).add(parentCommentId));
        
        setReplyText('');
        setReplyingToId(null);
        
        // Re-base the loaded window so the new reply is counted, then restore
        // every previously expanded thread
        await refreshLoadedWindow();
        notifyTicketChanged('commented', { comment: 'reply added' });
        
        // Restore all previously expanded states (this will fetch nested replies)
        await restoreExpandedStates();
      }
    } catch (error) {
      reactory.log('Error adding reply', { error }, 'error');
      reactory.createNotification('Failed to add reply', { 
        title: 'Error',
        options: { body: error.message || 'An error occurred while adding the reply' }
      });
    }
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyText('');
  };

  // ============================================================================
  // NESTED COMMENT RENDERER (Recursive Factory)
  // ============================================================================

  /**
   * Recursive function to render a comment and its nested replies
   * @param comment - The comment to render
   * @param depth - Current nesting depth (0 = root level)
   * @param isLastInThread - Whether this is the last comment in its thread
   */
  const renderComment = (comment: any, depth: number = 0, isLastInThread: boolean = false): React.ReactNode => {
    if (!comment) return null;

    const isExpanded = expandedReplies.has(comment.id);
    const replyWindow = replyPaging[comment.id];
    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    // Prefer the server total: the loaded replies are a page, not the thread.
    const replyCount = Math.max(replyWindow?.total ?? 0, replies.length);
    const hasReplies = replyCount > 0;    
    // Calculate indentation based on depth
    const indentLevel = depth * 4; // 4 units per level (32px)

    return (
      <Box key={comment.id} sx={{ position: 'relative' }}>
        {/* Threading line for nested comments */}
        {depth > 0 && (
          <Box
            sx={{
              position: 'absolute',
              left: indentLevel - 2,
              top: 0,
              bottom: isLastInThread ? '50%' : 0,
              width: '2px',
              bgcolor: 'divider',
            }}
          />
        )}

        <Card 
          variant="outlined"
          sx={{ 
            ml: indentLevel,
            mb: 2,
            position: 'relative',
            '&:hover': {
              boxShadow: 2,
            }
          }}
        >
          <CardContent>
            {/* Comment Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {UserAvatar && comment.who && (
                <Box sx={{ mr: 2 }}>
                  <UserAvatar
                    user={comment.who}
                    uiSchema={{
                      'ui:options': {
                        variant: 'avatar',
                        size: 'medium',
                        showEmail: false
                      }
                    }}
                  />
                </Box>
              )}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {comment.who ? 
                    `${comment.who.firstName} ${comment.who.lastName}` : 
                    'Unknown User'
                  }
                </Typography>
                {RelativeTime && (
                  <RelativeTime
                    date={comment.when}
                    uiSchema={{
                      'ui:options': {
                        format: 'relative',
                        tooltip: true,
                        variant: 'caption'
                      }
                    }}
                  />
                )}
              </Box>
              
              {/* Depth Indicator */}
              {depth > 0 && (
                <Chip 
                  label={`Level ${depth}`} 
                  size="small" 
                  sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                />
              )}

              {/* Action buttons (only for own comments) */}
              {userId && comment.who?.id === userId && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Edit">
                    <IconButton 
                      size="small"
                      onClick={() => handleEditComment(comment.id, comment.text)}
                    >
                      <Icon fontSize="small">edit</Icon>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Icon fontSize="small">delete</Icon>
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {/* Comment Content */}
            <Box 
              sx={{ 
                pl: UserAvatar && comment.who ? 7 : 0,
                '& p': { margin: 0, marginBottom: 1 },
                '& pre': { 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  backgroundColor: '#f5f5f5',
                  padding: 1,
                  borderRadius: 1
                },
                '& img': { 
                  maxWidth: '100%',
                  height: 'auto'
                }
              }}
            >
              {renderContent ? renderContent(comment.text) : (
                <Typography variant="body2">
                  {comment.text}
                </Typography>
              )}
            </Box>
          </CardContent>

          {/* Comment Actions */}
          <CardActions sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              startIcon={<Icon>reply</Icon>}
              onClick={() => handleReply(comment.id)}
              variant={replyingToId === comment.id ? 'contained' : 'text'}
            >
              Reply
            </Button>
            <Button
              size="small"
              startIcon={<Icon>thumb_up</Icon>}
              onClick={() => handleUpvote(comment.id)}
            >
              Like {comment.upvotes > 0 && `(${comment.upvotes})`}
            </Button>

            {/* Expand/Collapse Button for Nested Replies */}
            {hasReplies && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <Button
                  size="small"
                  startIcon={<Icon>{isExpanded ? 'expand_less' : 'expand_more'}</Icon>}
                  onClick={() => toggleReplies(comment.id)}
                  sx={{ ml: 'auto' }}
                >
                  {isExpanded ? 'Hide' : 'Show'} {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
                </Button>
              </>
            )}
          </CardActions>

          {/* Reply Box (Collapsible) */}
          <Collapse in={replyingToId === comment.id} timeout="auto" unmountOnExit>
            <Box sx={{ px: 2, pb: 2, pt: 0 }}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                {UserAvatar && (
                  <Box sx={{ pt: 1 }}>
                    <UserAvatar
                      user={currentUser?.loggedIn?.user}
                      uiSchema={{
                        'ui:options': {
                          variant: 'avatar',
                          size: 'small',
                        }
                      }}
                    />
                  </Box>
                )}
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Replying to {comment.who ? `${comment.who.firstName} ${comment.who.lastName}` : 'Unknown User'}
                  </Typography>
                  {RichEditorWidget ? (
                    <Box sx={{ mb: 2 }}>
                      <RichEditorWidget
                        reactory={reactory}
                        formData={replyText}              
                        onChange={(value: string) => setReplyText(value)}
                        uiSchema={{
                          'ui:options': {
                            height: 150,
                          }
                        }}
                      />
                    </Box>
                  ) : (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your reply here..."
                      variant="outlined"
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  )}
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleCancelReply}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Icon>send</Icon>}
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim()}
                    >
                      Reply
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </Card>

        {/* Nested Replies (Recursive) */}
        {hasReplies && isExpanded && (
          <Box sx={{ position: 'relative' }}>
            {replies.map((reply: any, index: number) => 
              renderComment(reply, depth + 1, index === replies.length - 1)
            )}

            {/* Reply paging: a thread longer than one page must stay reachable. */}
            {replyWindow && canLoadMoreComments(replyWindow) && (
              <Box sx={{ ml: indentLevel + 4, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {commentShowingLabel(replies.length, replyWindow.total)}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => loadReplies(comment.id, 'more')}
                  disabled={loadingReplies.has(comment.id)}
                  startIcon={<Icon>expand_more</Icon>}
                >
                  {loadingReplies.has(comment.id) ? 'Loading...' : 'Load more replies'}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with sort options */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {commentCountLabel(commentList.total)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={commentList.sortOrder === 'NEWEST' ? 'contained' : 'outlined'}
            onClick={() => handleSortChange('NEWEST')}
            startIcon={<Icon>arrow_downward</Icon>}
          >
            Newest
          </Button>
          <Button
            size="small"
            variant={commentList.sortOrder === 'OLDEST' ? 'contained' : 'outlined'}
            onClick={() => handleSortChange('OLDEST')}
            startIcon={<Icon>arrow_upward</Icon>}
          >
            Oldest
          </Button>
        </Box>
      </Box>

      {/* Comment Input */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Add a comment
        </Typography>
        
        {RichEditorWidget ? (
          <Box sx={{ mb: 2 }}>
            <RichEditorWidget
              key={composerKey}
              reactory={reactory}
              formData={commentText}              
              onChange={(value: string) => setCommentText(value)}              
            />
          </Box>
        ) : (
          <TextField
            fullWidth
            multiline
            rows={4}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write your comment here..."
            variant="outlined"
            sx={{ mb: 2 }}
          />
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Tip: Use Markdown for formatting
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setCommentText('');
                setComposerKey((key) => key + 1);
              }}
              disabled={!commentText}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Icon>send</Icon>}
              onClick={handleSubmitComment}
              disabled={!commentText?.trim()}
            >
              Post Comment
            </Button>
          </Box>
        </Box>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      {/* Comments List */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary">
            Loading comments...
          </Typography>
        </Box>
      ) : commentList.comments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Icon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }}>
            comment
          </Icon>
          <Typography variant="h6" color="text.secondary">
            No comments yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Be the first to comment on this ticket
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {commentList.comments.map((comment, index) => 
            renderComment(comment, 0, index === commentList.comments.length - 1)
          )}

          {/* The panel must never present a partial page as the whole history. */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, py: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {commentShowingLabel(commentList.comments.length, commentList.total)}
            </Typography>
            {canLoadMoreComments(commentList) && (
              <Button
                size="small"
                variant="outlined"
                onClick={loadMoreComments}
                disabled={loadingMore}
                startIcon={<Icon>expand_more</Icon>}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon color="error">warning</Icon>
            <Typography variant="h6">Delete Comment</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this comment? This action cannot be undone.
            The comment will be marked as removed and will no longer be visible.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelDelete} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
            startIcon={<Icon>delete</Icon>}
            autoFocus
          >
            Delete Comment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Definition: any = {
  name: 'SupportTicketComments',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketComments,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketComments,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketComments 
  });
}
