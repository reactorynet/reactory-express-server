import Reactory from '@reactorynet/reactory-core';

interface OverviewDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  StatusBadge: any,
  UserAvatar: any,
  RelativeTime: any,
  ChipArray: any,
  useContentRender: any,
  SupportTicketWorkflow: any,
}

interface OverviewProps {
  reactory: Reactory.Client.IReactoryApi,
  ticket: Reactory.Models.IReactorySupportTicket,
}

type DialogType = 'edit' | 'reassign' | 'priority' | 'tags' | 'close' | null;

interface UserSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: '#d32f2f' },
  { value: 'high', label: 'High', color: '#f57c00' },
  { value: 'medium', label: 'Medium', color: '#1976d2' },
  { value: 'low', label: 'Low', color: '#757575' },
];

const SupportTicketOverview = (props: OverviewProps) => {
  const { reactory, ticket } = props;

  if (!ticket) {
    return <div>No ticket data available</div>;
  }

  const { 
    React, 
    Material,
    StatusBadge,
    UserAvatar,
    RelativeTime,
    ChipArray,
    useContentRender,
    SupportTicketWorkflow,
  } = reactory.getComponents<OverviewDependencies>([
    'react.React',
    'material-ui.Material',
    'core.StatusBadge',
    'core.UserAvatar',
    'core.RelativeTime',
    'core.ChipArray',
    'core.useContentRender',
    'core.SupportTicketWorkflow',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Grid, 
    Paper,
    Divider,
    Button,
    Icon,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    CircularProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
  } = MaterialCore;

  const { renderContent } = useContentRender ? useContentRender(reactory) : { 
    renderContent: (content: string) => content 
  };

  const [activeDialog, setActiveDialog] = React.useState<DialogType>(null);
  const [loading, setLoading] = React.useState(false);

  const [editForm, setEditForm] = React.useState({ request: ticket.request || '', description: ticket.description || '' });
  const [selectedPriority, setSelectedPriority] = React.useState(ticket.priority || 'medium');
  const [tagInput, setTagInput] = React.useState('');
  const [newTags, setNewTags] = React.useState<string[]>([]);

  const [userSearchQuery, setUserSearchQuery] = React.useState('');
  const [userSearchResults, setUserSearchResults] = React.useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<UserSearchResult | null>(null);
  const [userSearchLoading, setUserSearchLoading] = React.useState(false);

  const searchUsers = React.useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    setUserSearchLoading(true);
    try {
      const result = await reactory.graphqlQuery<
        { ReactoryUsers: { users: UserSearchResult[] } | { error: string } },
        { filter: { searchString: string }, paging: { page: number, pageSize: number } }
      >(
        `query ReactoryUsers($filter: ReactoryUserFilterInput, $paging: PagingRequest) {
          ReactoryUsers(filter: $filter, paging: $paging) {
            ... on PagedUserResults {
              users {
                id
                firstName
                lastName
                email
                avatar
              }
            }
            ... on ReactoryUserQueryFailed {
              error
            }
          }
        }`,
        { filter: { searchString: query }, paging: { page: 1, pageSize: 10 } }
      ).then();
      const data = result?.data?.ReactoryUsers;
      if (data && 'users' in data) {
        setUserSearchResults(data.users || []);
      }
    } catch (err) {
      reactory.log('Error searching users', { err }, 'error');
    } finally {
      setUserSearchLoading(false);
    }
  }, [reactory]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery.length >= 2) searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  const handleClose = () => {
    setActiveDialog(null);
    setLoading(false);
    setUserSearchQuery('');
    setUserSearchResults([]);
    setSelectedUser(null);
    setNewTags([]);
    setTagInput('');
  };

  const handleEditSubmit = async () => {
    if (!SupportTicketWorkflow) return;
    setLoading(true);
    const updated = await SupportTicketWorkflow.updateTicket({
      ticket,
      updates: {
        request: editForm.request,
        description: editForm.description,
      },
    });
    setLoading(false);
    if (updated) {
      reactory.amq.raiseReactoryPluginEvent('support_ticket_updated', { ticket: updated });
      handleClose();
    }
  };

  const handleReassignSubmit = async () => {
    if (!SupportTicketWorkflow || !selectedUser) return;
    setLoading(true);
    const updated = await SupportTicketWorkflow.reassignTicket({
      ticket,
      assignTo: selectedUser.id,
    });
    setLoading(false);
    if (updated) {
      reactory.amq.raiseReactoryPluginEvent('support_ticket_updated', { ticket: updated });
      handleClose();
    }
  };

  const handlePrioritySubmit = async () => {
    if (!SupportTicketWorkflow) return;
    setLoading(true);
    const updated = await SupportTicketWorkflow.changePriority({
      ticket,
      priority: selectedPriority,
    });
    setLoading(false);
    if (updated) {
      reactory.amq.raiseReactoryPluginEvent('support_ticket_updated', { ticket: updated });
      handleClose();
    }
  };

  const handleAddTagKeyDown = (e: any) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!newTags.includes(tag)) {
        setNewTags([...newTags, tag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveNewTag = (tagToRemove: string) => {
    setNewTags(newTags.filter(t => t !== tagToRemove));
  };

  const handleTagsSubmit = async () => {
    if (!SupportTicketWorkflow || newTags.length === 0) return;
    setLoading(true);
    const updated = await SupportTicketWorkflow.addTags({
      ticket,
      tags: newTags,
    });
    setLoading(false);
    if (updated) {
      reactory.amq.raiseReactoryPluginEvent('support_ticket_updated', { ticket: updated });
      handleClose();
    }
  };

  const handleCloseTicket = async () => {
    if (!SupportTicketWorkflow) return;
    setLoading(true);
    const closed = await SupportTicketWorkflow.closeTicket({ ticket });
    setLoading(false);
    if (closed) {
      reactory.amq.raiseReactoryPluginEvent('support_ticket_updated', { ticket: { ...ticket, status: 'closed' } });
      handleClose();
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Title Section */}
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            mb: 2,
            color: 'text.primary'
          }}
        >
          {ticket.request || 'No title'}
        </Typography>
        
        {ticket.description && (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2,               
              mb: 3,
              '& pre': {
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto'
              }
            }}
          >
            {renderContent ? (
              renderContent(ticket.description)
            ) : (
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  color: 'text.secondary'
                }}
              >
                {ticket.description}
              </Typography>
            )}
          </Paper>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Key Information Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Logged By
              </Typography>
              {UserAvatar && ticket.createdBy ? (
                <UserAvatar
                  user={ticket.createdBy}
                  uiSchema={{ 'ui:options': { variant: 'avatar-name', size: 'medium', showEmail: true } }}
                />
              ) : (
                <Typography variant="body2">Not specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Assigned To
              </Typography>
              {UserAvatar ? (
                <UserAvatar
                  user={ticket.assignedTo}
                  uiSchema={{ 'ui:options': { variant: 'avatar-name', size: 'medium', showEmail: true, unassignedText: 'Unassigned', unassignedIcon: 'person_add_disabled' } }}
                />
              ) : (
                <Typography variant="body2">
                  {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Request Type
              </Typography>
              {StatusBadge && ticket.requestType ? (
                <StatusBadge
                  value={ticket.requestType}
                  uiSchema={{
                    'ui:options': {
                      variant: 'outlined', size: 'medium',
                      colorMap: { 'bug': '#f44336', 'feature': '#9c27b0', 'question': '#2196f3', 'support': '#4caf50', 'other': '#757575' },
                      iconMap: { 'bug': 'bug_report', 'feature': 'lightbulb', 'question': 'help', 'support': 'support_agent', 'other': 'more_horiz' }
                    }
                  }}
                />
              ) : (
                <Typography variant="body2">Not specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Created
              </Typography>
              {RelativeTime && ticket.createdDate ? (
                <RelativeTime
                  date={ticket.createdDate}
                  uiSchema={{ 'ui:options': { format: 'relative', tooltip: true, tooltipFormat: 'YYYY-MM-DD HH:mm:ss', variant: 'body1', icon: 'schedule' } }}
                />
              ) : (
                <Typography variant="body2">Not specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Last Updated
              </Typography>
              {RelativeTime && ticket.updatedDate ? (
                <RelativeTime
                  date={ticket.updatedDate}
                  uiSchema={{ 'ui:options': { format: 'relative', tooltip: true, tooltipFormat: 'YYYY-MM-DD HH:mm:ss', variant: 'body1', icon: 'update' } }}
                />
              ) : (
                <Typography variant="body2">Not specified</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                SLA Status
              </Typography>
              {ticket.slaDeadline ? (
                <Box>
                  {RelativeTime && (
                    <RelativeTime
                      date={ticket.slaDeadline}
                      uiSchema={{ 'ui:options': { format: 'relative', tooltip: true, variant: 'body1', icon: ticket.isOverdue ? 'warning' : 'timer' } }}
                    />
                  )}
                  {ticket.isOverdue && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>OVERDUE</Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2">No SLA set</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {ticket.tags && ticket.tags.length > 0 && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Tags
                </Typography>
                {ChipArray ? (
                  <ChipArray
                    formData={ticket.tags}
                    uiSchema={{ 'ui:options': { labelFormat: '${item}', allowDelete: false, allowAdd: false } }}
                  />
                ) : (
                  <Typography variant="body2">{ticket.tags.join(', ')}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Quick Actions */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<Icon>edit</Icon>}
          size="small"
          onClick={() => {
            setEditForm({ request: ticket.request || '', description: ticket.description || '' });
            setActiveDialog('edit');
          }}
        >
          Edit Ticket
        </Button>
        <Button
          variant="outlined"
          startIcon={<Icon>person_add</Icon>}
          size="small"
          onClick={() => setActiveDialog('reassign')}
        >
          Reassign
        </Button>
        <Button
          variant="outlined"
          startIcon={<Icon>flag</Icon>}
          size="small"
          onClick={() => {
            setSelectedPriority(ticket.priority || 'medium');
            setActiveDialog('priority');
          }}
        >
          Change Priority
        </Button>
        <Button
          variant="outlined"
          startIcon={<Icon>label</Icon>}
          size="small"
          onClick={() => setActiveDialog('tags')}
        >
          Add Tags
        </Button>
        {ticket.status !== 'closed' && (
          <Button
            variant="outlined"
            color="success"
            startIcon={<Icon>check_circle</Icon>}
            size="small"
            onClick={() => setActiveDialog('close')}
          >
            Close Ticket
          </Button>
        )}
      </Box>

      {/* Edit Ticket Dialog */}
      <Dialog open={activeDialog === 'edit'} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Ticket</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={editForm.request}
            onChange={(e: any) => setEditForm({ ...editForm, request: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={6}
            value={editForm.description}
            onChange={(e: any) => setEditForm({ ...editForm, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={loading || !editForm.request.trim()}
          >
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={activeDialog === 'reassign'} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Reassign Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search for a user to assign this ticket to.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Search users by name or email"
            fullWidth
            value={userSearchQuery}
            onChange={(e: any) => {
              setUserSearchQuery(e.target.value);
              setSelectedUser(null);
            }}
            sx={{ mb: 2 }}
          />
          {userSearchLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {userSearchResults.length > 0 && !selectedUser && (
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {userSearchResults.map((user: UserSearchResult) => (
                <ListItem
                  key={user.id}
                  button
                  selected={selectedUser?.id === user.id}
                  onClick={() => {
                    setSelectedUser(user);
                    setUserSearchQuery(`${user.firstName} ${user.lastName}`);
                    setUserSearchResults([]);
                  }}
                >
                  <ListItemAvatar>
                    <Avatar src={user.avatar}>{user.firstName?.[0]}{user.lastName?.[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary={user.email}
                  />
                </ListItem>
              ))}
            </List>
          )}
          {selectedUser && (
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={selectedUser.avatar}>{selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}</Avatar>
              <Box>
                <Typography variant="body1">{selectedUser.firstName} {selectedUser.lastName}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleReassignSubmit}
            variant="contained"
            disabled={loading || !selectedUser}
          >
            {loading ? <CircularProgress size={20} /> : 'Reassign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Priority Dialog */}
      <Dialog open={activeDialog === 'priority'} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Change Priority</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={selectedPriority}
              label="Priority"
              onChange={(e: any) => setSelectedPriority(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color }} />
                    {p.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handlePrioritySubmit}
            variant="contained"
            disabled={loading || selectedPriority === ticket.priority}
          >
            {loading ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Tags Dialog */}
      <Dialog open={activeDialog === 'tags'} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Tags</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Type a tag and press Enter to add it.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="New tag"
            fullWidth
            value={tagInput}
            onChange={(e: any) => setTagInput(e.target.value)}
            onKeyDown={handleAddTagKeyDown}
            sx={{ mb: 2 }}
          />
          {newTags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {newTags.map((tag) => (
                <Chip key={tag} label={tag} onDelete={() => handleRemoveNewTag(tag)} color="primary" variant="outlined" />
              ))}
            </Box>
          )}
          {ticket.tags && ticket.tags.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Existing tags
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {ticket.tags.map((tag: string) => (
                  <Chip key={tag} label={tag} size="small" />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleTagsSubmit}
            variant="contained"
            disabled={loading || newTags.length === 0}
          >
            {loading ? <CircularProgress size={20} /> : 'Add Tags'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Ticket Confirmation Dialog */}
      <Dialog open={activeDialog === 'close'} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Close Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to close ticket <strong>#{ticket.reference}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will mark the ticket as resolved. You can reopen it later if needed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleCloseTicket}
            variant="contained"
            color="success"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Close Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Definition: any = {
  name: 'SupportTicketOverview',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketOverview,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketOverview,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketOverview 
  });
}
