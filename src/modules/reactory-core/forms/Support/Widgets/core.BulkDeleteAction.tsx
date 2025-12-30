import Reactory from '@reactory/reactory-core';

interface BulkDeleteActionDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface BulkDeleteActionProps {
  reactory: Reactory.Client.IReactoryApi;
  selectedTickets: Partial<Reactory.Models.IReactorySupportTicket>[];
  onComplete: (deletedIds: string[]) => void;
  onCancel: () => void;
}

/**
 * BulkDeleteAction Component
 * 
 * Dialog for deleting multiple support tickets with safety checks.
 * 
 * Features:
 * - Two-stage confirmation
 * - Type-to-confirm for large deletions
 * - Warning for important tickets (in-progress, assigned)
 * - Progress tracking
 * - Error handling with retry
 * - Success/failure summary
 * 
 * @example
 * <BulkDeleteAction
 *   selectedTickets={[ticket1, ticket2]}
 *   onComplete={(ids) => console.log('Deleted:', ids)}
 *   onCancel={() => console.log('cancelled')}
 * />
 */
const BulkDeleteAction = (props: BulkDeleteActionProps) => {
  const { reactory, selectedTickets, onComplete, onCancel } = props;

  // Get dependencies from registry
  const {
    React,
    Material,
  } = reactory.getComponents<BulkDeleteActionDependencies>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    LinearProgress,
    Typography,
    Box,
    Alert,
    List,
    ListItem,
    ListItemText,
    Icon,
    Chip,
  } = MaterialCore;

  // Loading check
  if (!React || !Material) {
    return null;
  }

  const [confirmText, setConfirmText] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [errors, setErrors] = React.useState<Array<{ ticket: any; error: string }>>([]);
  const [completed, setCompleted] = React.useState(false);

  const requireConfirmation = selectedTickets.length > 5;
  const expectedConfirmText = `DELETE ${selectedTickets.length}`;

  // Analyze selected tickets for warnings
  const warnings = React.useMemo(() => {
    const warns: string[] = [];
    
    const inProgressCount = selectedTickets.filter(t => 
      ['in-progress', 'open'].includes(t.status || '')
    ).length;
    
    const assignedCount = selectedTickets.filter(t => t.assignedTo).length;
    
    const recentCount = selectedTickets.filter(t => {
      if (!t.createdDate) return false;
      const daysSinceCreation = (Date.now() - new Date(t.createdDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation < 7;
    }).length;

    if (inProgressCount > 0) {
      warns.push(`${inProgressCount} ticket${inProgressCount > 1 ? 's are' : ' is'} in progress or open`);
    }
    
    if (assignedCount > 0) {
      warns.push(`${assignedCount} ticket${assignedCount > 1 ? 's are' : ' is'} assigned to users`);
    }
    
    if (recentCount > 0) {
      warns.push(`${recentCount} ticket${recentCount > 1 ? 's were' : ' was'} created in the last 7 days`);
    }

    return warns;
  }, [selectedTickets]);

  const handleDelete = async () => {
    setProcessing(true);
    setErrors([]);
    setProgress(0);

    const deleted: string[] = [];
    const failed: Array<{ ticket: any; error: string }> = [];

    for (let i = 0; i < selectedTickets.length; i++) {
      const ticket = selectedTickets[i];
      
      try {
        // Call GraphQL mutation to delete ticket
        const result = await reactory.graphqlMutation(
          `mutation DeleteTicket($id: String!) {
            deleteSupportTicket(id: $id) {
              success
              message
            }
          }`,
          {
            id: ticket.id,
          }
        );

        if (result.data?.deleteSupportTicket?.success) {
          deleted.push(ticket.id!);
        } else {
          throw new Error(result.data?.deleteSupportTicket?.message || 'Failed to delete ticket');
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
        onComplete(deleted);
      }, 1500);
    }
  };

  const handleRetry = () => {
    setErrors([]);
    setCompleted(false);
    handleDelete();
  };

  const canDelete = requireConfirmation 
    ? confirmText === expectedConfirmText
    : true;

  return (
    <Dialog
      open={true}
      onClose={!processing ? onCancel : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon color="error">delete_forever</Icon>
          <Typography variant="h6" color="error.main">
            Delete {selectedTickets.length} Ticket{selectedTickets.length > 1 ? 's' : ''}?
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {!completed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Warning Message */}
            <Alert severity="error" icon={<Icon>warning</Icon>}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                This action cannot be undone!
              </Typography>
              <Typography variant="body2">
                All ticket data, comments, attachments, and history will be permanently deleted.
              </Typography>
            </Alert>

            {/* Specific Warnings */}
            {warnings.length > 0 && (
              <Alert severity="warning">
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Important:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {warnings.map((warning, index) => (
                    <li key={index}>
                      <Typography variant="body2">{warning}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Confirmation Input */}
            {requireConfirmation && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  To confirm deletion, type <strong>{expectedConfirmText}</strong>
                </Typography>
                <TextField
                  fullWidth
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={processing}
                  placeholder={expectedConfirmText}
                  autoFocus
                  error={confirmText !== '' && confirmText !== expectedConfirmText}
                  helperText={
                    confirmText !== '' && confirmText !== expectedConfirmText
                      ? 'Confirmation text does not match'
                      : ''
                  }
                />
              </Box>
            )}

            {/* Selected Tickets List */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Tickets to Delete:
              </Typography>
              <List dense sx={{ maxHeight: 250, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                {selectedTickets.map((ticket) => (
                  <ListItem key={ticket.id}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">{ticket.reference}</Typography>
                          <Chip label={ticket.status} size="small" sx={{ fontSize: '0.7rem' }} />
                          {ticket.assignedTo && (
                            <Chip 
                              label={`Assigned: ${(ticket.assignedTo as Reactory.Models.IUser).firstName}`} 
                              size="small" 
                              color="warning"
                              sx={{ fontSize: '0.7rem' }} 
                            />
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
                <LinearProgress variant="determinate" value={progress} color="error" />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Deleting: {Math.round(progress)}%
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Success Summary */}
            {errors.length === 0 ? (
              <Alert severity="success" icon={<Icon>check_circle</Icon>}>
                Successfully deleted {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}
              </Alert>
            ) : (
              <>
                {/* Partial Success */}
                <Alert severity="warning" icon={<Icon>warning</Icon>}>
                  Deleted {selectedTickets.length - errors.length} of {selectedTickets.length} tickets
                </Alert>

                {/* Error List */}
                <Box>
                  <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                    Failed Deletions:
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
              onClick={handleDelete}
              variant="contained"
              color="error"
              disabled={!canDelete || processing}
              startIcon={processing ? <Icon>hourglass_empty</Icon> : <Icon>delete_forever</Icon>}
            >
              {processing ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </>
        ) : (
          <>
            {errors.length > 0 && (
              <Button onClick={handleRetry} startIcon={<Icon>refresh</Icon>} color="error">
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
  name: 'BulkDeleteAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: BulkDeleteAction,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    BulkDeleteAction,
    ['Support Tickets', 'Bulk Actions', 'Delete'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: BulkDeleteAction 
  });
}

export default BulkDeleteAction;
