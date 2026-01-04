import Reactory from '@reactory/reactory-core';

interface BulkAssignActionDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  UserAvatar: any;
}

interface BulkAssignActionProps {
  reactory: Reactory.Client.IReactoryApi;
  selectedTickets: Partial<Reactory.Models.IReactorySupportTicket>[];
  onComplete: (updatedTickets: Partial<Reactory.Models.IReactorySupportTicket>[]) => void;
  onCancel: () => void;
}

/**
 * BulkAssignAction Component
 * 
 * Dialog for assigning multiple support tickets to a user.
 * 
 * Features:
 * - User search and selection
 * - Unassign option
 * - Optional notification toggle
 * - Progress tracking
 * - Error handling with retry
 * - Success/failure summary
 * 
 * @example
 * <BulkAssignAction
 *   selectedTickets={[ticket1, ticket2]}
 *   onComplete={(updated) => console.log(updated)}
 *   onCancel={() => console.log('cancelled')}
 * />
 */
const BulkAssignAction = (props: BulkAssignActionProps) => {
  const { reactory, selectedTickets, onComplete, onCancel } = props;

  // Get dependencies from registry
  const {
    React,
    Material,
    UserAvatar,
  } = reactory.getComponents<BulkAssignActionDependencies>([
    'react.React',
    'material-ui.Material',
    'core.UserAvatar',
  ]);

  const { MaterialCore } = Material;
  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    LinearProgress,
    Typography,
    Box,
    Alert,
    List,
    ListItem,
    ListItemText,
    FormControlLabel,
    Checkbox,
    Icon,
    Chip,
    Avatar,
  } = MaterialCore;

  // Loading check
  if (!React || !Material) {
    return null;
  }

  const [selectedUser, setSelectedUser] = React.useState<Partial<Reactory.Models.IUser> | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [users, setUsers] = React.useState<Partial<Reactory.Models.IUser>[]>([]);
  const [sendNotification, setSendNotification] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [errors, setErrors] = React.useState<Array<{ ticket: any; error: string }>>([]);
  const [completed, setCompleted] = React.useState(false);

  // Load users
  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        const result = await reactory.graphqlQuery(
          `query GetUsers($search: String) {
            users(search: $search, roles: ["SUPPORT_AGENT", "ADMIN"]) {
              id
              firstName
              lastName
              email
              avatar
            }
          }`,
          { search: searchText || undefined }
        );

        if (result.data?.users) {
          setUsers(result.data.users);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };

    const debounce = setTimeout(loadUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchText]);

  const handleAssign = async () => {
    setProcessing(true);
    setErrors([]);
    setProgress(0);

    const results: Partial<Reactory.Models.IReactorySupportTicket>[] = [];
    const failed: Array<{ ticket: any; error: string }> = [];

    for (let i = 0; i < selectedTickets.length; i++) {
      const ticket = selectedTickets[i];
      
      try {
        // Call GraphQL mutation to assign ticket
        const result = await reactory.graphqlMutation(
          `mutation AssignTicket($id: String!, $userId: String, $sendNotification: Boolean) {
            assignSupportTicket(id: $id, userId: $userId, sendNotification: $sendNotification) {
              id
              assignedTo {
                id
                firstName
                lastName
                email
                avatar
              }
              updatedDate
            }
          }`,
          {
            id: ticket.id,
            userId: selectedUser?.id || null,
            sendNotification,
          }
        );

        if (result.data?.assignSupportTicket) {
          results.push({
            ...ticket,
            assignedTo: result.data.assignSupportTicket.assignedTo,
            updatedDate: result.data.assignSupportTicket.updatedDate,
          });
        } else {
          throw new Error('Failed to assign ticket');
        }
      } catch (error: any) {
        failed.push({
          ticket,
          error: error.message || 'Unknown error',
        });
      }

      setProgress(((i + 1) / selectedTickets.length) * 100);
    }

    setProcessing(false);
    setErrors(failed);
    setCompleted(true);

    if (failed.length === 0) {
      // All succeeded
      setTimeout(() => {
        onComplete(results);
      }, 1500);
    }
  };

  const handleRetry = () => {
    setErrors([]);
    setCompleted(false);
    handleAssign();
  };

  const handleUnassign = () => {
    setSelectedUser(null);
  };

  return (
    <Dialog
      open={true}
      onClose={!processing ? onCancel : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon>person_add</Icon>
          <Typography variant="h6">
            Assign {selectedTickets.length} Ticket{selectedTickets.length > 1 ? 's' : ''}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {!completed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* User Search */}
            <TextField
              fullWidth
              label="Search Users"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              disabled={processing}
              placeholder="Search by name or email..."
              InputProps={{
                startAdornment: <Icon sx={{ mr: 1 }}>search</Icon>,
              }}
            />

            {/* User Selection */}
            <Box>
              {selectedUser ? (
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'primary.main',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {UserAvatar ? (
                      <UserAvatar reactory={reactory} formData={selectedUser} variant="avatar" size="small" />
                    ) : (
                      <Avatar>{selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}</Avatar>
                    )}
                    <Box>
                      <Typography variant="body1">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedUser.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    onClick={handleUnassign}
                    disabled={processing}
                    startIcon={<Icon>clear</Icon>}
                  >
                    Clear
                  </Button>
                </Box>
              ) : (
                <FormControl fullWidth>
                  <InputLabel>Select User</InputLabel>
                  <Select
                    value=""
                    label="Select User"
                    onChange={(e) => {
                      const user = users.find(u => u.id === e.target.value);
                      setSelectedUser(user || null);
                    }}
                    disabled={processing}
                  >
                    <MenuItem value="">
                      <em>Unassigned</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24 }}>
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </Avatar>
                          {user.firstName} {user.lastName}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* Send Notification Option */}
            {selectedUser && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                    disabled={processing}
                  />
                }
                label="Send email notification to assignee"
              />
            )}

            {/* Selected Tickets Preview */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Selected Tickets:
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                {selectedTickets.map((ticket) => (
                  <ListItem key={ticket.id}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{ticket.reference}</Typography>
                          {ticket.assignedTo ? (
                            <Chip
                              label={`${(ticket.assignedTo as Reactory.Models.IUser).firstName} ${(ticket.assignedTo as Reactory.Models.IUser).lastName}`}
                              size="small"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Chip label="Unassigned" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          )}
                        </Box>
                      }
                      secondary={ticket.request}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Progress Bar */}
            {processing && (
              <Box>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Processing: {Math.round(progress)}%
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Success Summary */}
            {errors.length === 0 ? (
              <Alert severity="success" icon={<Icon>check_circle</Icon>}>
                Successfully assigned {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}
                {selectedUser ? ` to ${selectedUser.firstName} ${selectedUser.lastName}` : ' (unassigned)'}
              </Alert>
            ) : (
              <>
                {/* Partial Success */}
                <Alert severity="warning" icon={<Icon>warning</Icon>}>
                  Assigned {selectedTickets.length - errors.length} of {selectedTickets.length} tickets
                </Alert>

                {/* Error List */}
                <Box>
                  <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                    Failed Assignments:
                  </Typography>
                  <List dense>
                    {errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={error.ticket.reference}
                          secondary={error.error}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!completed ? (
          <>
            <Button onClick={onCancel} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              variant="contained"
              disabled={processing}
              startIcon={processing ? <Icon>hourglass_empty</Icon> : <Icon>check</Icon>}
            >
              {processing ? 'Processing...' : selectedUser ? 'Assign' : 'Unassign'}
            </Button>
          </>
        ) : (
          <>
            {errors.length > 0 && (
              <Button onClick={handleRetry} startIcon={<Icon>refresh</Icon>}>
                Retry Failed
              </Button>
            )}
            <Button onClick={onCancel} variant="contained">
              Close
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'BulkAssignAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: BulkAssignAction,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    BulkAssignAction,
    ['Support Tickets', 'Bulk Actions', 'Assignment'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: BulkAssignAction 
  });
}

export default BulkAssignAction;
