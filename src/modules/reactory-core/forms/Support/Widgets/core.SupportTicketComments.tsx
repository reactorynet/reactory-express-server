import Reactory from '@reactory/reactory-core';

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
  const { reactory, ticket } = props;

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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'newest' | 'oldest'>('newest');
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [commentToDelete, setCommentToDelete] = React.useState<string | null>(null);
  const [comments, setComments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expandedReplies, setExpandedReplies] = React.useState<Set<string>>(new Set());

  // Initialize content renderer
  const { renderContent } = useContentRender ? useContentRender(reactory) : { 
    renderContent: (content: string) => content 
  };

  // Get current user
  const currentUser = reactory.getUser();
  const userId = currentUser?.loggedIn?.user?.id;

  // Fetch comments for this ticket
  const fetchComments = React.useCallback(async () => {
    if (!ticket?.id) return;

    setLoading(true);
    try {
      const result = await reactory.graphqlQuery(`
        query GetCommentsByContext($context: String!, $contextId: String!) {
          getCommentsByContext(context: $context, contextId: $contextId) {
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
            }
          }
        }
      `, {
        context: 'ReactorySupportTicket',
        contextId: ticket.id,
      });

      if (result.data?.getCommentsByContext?.comments) {
        setComments(result.data.getCommentsByContext.comments);
      }
    } catch (error) {
      reactory.log('Error fetching comments', { error }, 'error');
      reactory.createNotification('Failed to load comments', {
        title: 'Error',
        options: { body: 'Could not load comments for this ticket' }
      });
    } finally {
      setLoading(false);
    }
  }, [ticket?.id, reactory]);

  // Load comments on mount and when ticket changes
  React.useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Listen for comment updates
  React.useEffect(() => {
    const handleUpdate = async (event: any) => {
      if (event.ticketId === ticket.id) {
        await fetchComments();
        await restoreExpandedStates();
      }
    };

    reactory.on('core.SupportTicketUpdated', handleUpdate);
    
    return () => {
      reactory.off('core.SupportTicketUpdated', handleUpdate);
    };
  }, [ticket.id, fetchComments, restoreExpandedStates, reactory]);

  // Fetch nested replies for a comment
  const fetchReplies = async (commentId: string) => {
    try {
      const result = await reactory.graphqlQuery(`
        query GetCommentReplies($commentId: ObjID!) {
          getCommentReplies(commentId: $commentId) {
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
                }
                upvotes
              }
            }
          }
        }
      `, {
        commentId,
      });

      if (result.data?.getCommentReplies?.comments) {
        // Update the comment in the list with fetched replies
        setComments(prevComments => {
          const updateReplies = (commentsList: any[]): any[] => {
            return commentsList.map(comment => {
              if (comment.id === commentId) {
                return {
                  ...comment,
                  replies: result.data.getCommentReplies.comments,
                };
              }
              // Recursively update nested replies
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateReplies(comment.replies),
                };
              }
              return comment;
            });
          };
          return updateReplies(prevComments);
        });
      }
    } catch (error) {
      reactory.log('Error fetching replies', { error, commentId }, 'error');
    }
  };

  // Restore expanded state for all comments in the tree
  const restoreExpandedStates = React.useCallback(async () => {
    if (expandedReplies.size === 0) return;
    
    // Helper function to find all comment IDs in the tree
    const findCommentInTree = (commentsList: any[], targetId: string): any => {
      for (const comment of commentsList) {
        if (comment.id === targetId) return comment;
        if (comment.replies && comment.replies.length > 0) {
          const found = findCommentInTree(comment.replies, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    // Fetch replies for all expanded comments
    const expandedIds = Array.from(expandedReplies);
    
    for (const commentId of expandedIds) {
      // Check if this comment exists in the current tree
      const comment = findCommentInTree(comments, commentId);
      if (comment) {
        // Fetch its replies to restore the expanded state
        await fetchReplies(commentId);
      }
    }
  }, [expandedReplies, comments]);

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
      // Expand and fetch nested replies
      setExpandedReplies(prev => new Set(prev).add(commentId));
      await fetchReplies(commentId);
    }
  };

  // Sort comments
  const sortedComments = React.useMemo(() => {
    if (!comments || comments.length === 0) return [];
    
    const sorted = [...comments];
    return sorted.sort((a, b) => {
      const dateA = new Date(a.when).getTime();
      const dateB = new Date(b.when).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [comments, sortBy]);

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
        // Refresh comments and restore expanded states
        await fetchComments();
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
        
        // Refresh comments and restore expanded states
        await fetchComments();
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
        
        // Refresh comments and restore expanded states
        await fetchComments();
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
        // Refresh comments and restore expanded states
        await fetchComments();
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
        
        // Refresh comments to get the new reply
        await fetchComments();
        
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

    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);
    const replyCount = comment.replies?.length || 0;
    
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
            {comment.replies.map((reply: any, index: number) => 
              renderComment(reply, depth + 1, index === comment.replies.length - 1)
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
          Comments ({sortedComments.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={sortBy === 'newest' ? 'contained' : 'outlined'}
            onClick={() => setSortBy('newest')}
            startIcon={<Icon>arrow_downward</Icon>}
          >
            Newest
          </Button>
          <Button
            size="small"
            variant={sortBy === 'oldest' ? 'contained' : 'outlined'}
            onClick={() => setSortBy('oldest')}
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
              onClick={() => setCommentText('')}
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
      ) : sortedComments.length === 0 ? (
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
          {sortedComments.map((comment, index) => 
            renderComment(comment, 0, index === sortedComments.length - 1)
          )}
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
