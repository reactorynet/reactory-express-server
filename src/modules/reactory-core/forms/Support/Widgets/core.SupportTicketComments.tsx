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
  } = MaterialCore;

  const [commentText, setCommentText] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<'newest' | 'oldest'>('newest');

  // Initialize content renderer
  const { renderContent } = useContentRender ? useContentRender(reactory) : { 
    renderContent: (content: string) => content 
  };

  // Get current user
  const currentUser = reactory.getUser();
  const userId = currentUser?.loggedIn?.user?.id;

  // Sort comments
  const sortedComments = React.useMemo(() => {
    if (!ticket.comments || ticket.comments.length === 0) return [];
    
    const comments = [...ticket.comments];
    return comments.sort((a, b) => {
      const dateA = new Date(a.when).getTime();
      const dateB = new Date(b.when).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [ticket.comments, sortBy]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      reactory.createNotification('Comment cannot be empty', { type: 'warning' });
      return;
    }

    try {
      // Call mutation to add comment
      const result = await reactory.graphqlMutation(`
        mutation AddSupportTicketComment($ticketId: String!, $comment: String!) {
          ReactorySupportTicketComment(ticketId: $ticketId, comment: $comment) {
            id
            comments {
              id
              text
              who {
                id
                firstName
                lastName
                avatar
                email
              }
              when
            }
          }
        }
      `, {
        ticketId: ticket.id,
        comment: commentText
      });

      if (result.data) {
        reactory.createNotification('Comment added successfully', { type: 'success' });
        setCommentText('');
        // Refresh the ticket data
        reactory.emit('core.SupportTicketUpdatedEvent', { ticket: result.data.ReactorySupportTicketComment });
      }
    } catch (error) {
      reactory.log('Error adding comment', { error }, 'error');
      reactory.createNotification('Failed to add comment', { type: 'error' });
    }
  };

  const handleEditComment = (commentId: string) => {
    setEditingId(commentId);
    // TODO: Load comment text for editing
  };

  const handleDeleteComment = async (commentId: string) => {
    // TODO: Implement delete mutation
    reactory.createNotification('Delete comment - Coming soon', { type: 'info' });
  };

  const handleReply = (commentId: string) => {
    setReplyingToId(commentId);
    // TODO: Implement threaded replies
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
              disabled={!commentText.trim()}
            >
              Post Comment
            </Button>
          </Box>
        </Box>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      {/* Comments List */}
      {sortedComments.length === 0 ? (
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedComments.map((comment) => (
            <Card key={comment.id} variant="outlined">
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
                  
                  {/* Action buttons (only for own comments) */}
                  {userId && comment.who?.id === userId && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small"
                          onClick={() => handleEditComment(comment.id)}
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
              <CardActions sx={{ px: 2, py: 1 }}>
                <Button
                  size="small"
                  startIcon={<Icon>reply</Icon>}
                  onClick={() => handleReply(comment.id)}
                >
                  Reply
                </Button>
                <Button
                  size="small"
                  startIcon={<Icon>thumb_up</Icon>}
                >
                  Like {comment.upvotes > 0 && `(${comment.upvotes})`}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}
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
