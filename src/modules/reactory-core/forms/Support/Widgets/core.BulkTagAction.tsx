import Reactory from '@reactory/reactory-core';

interface BulkTagActionDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface BulkTagActionProps {
  reactory: Reactory.Client.IReactoryApi;
  selectedTickets: Partial<Reactory.Models.IReactorySupportTicket>[];
  onComplete: (updatedTickets: Partial<Reactory.Models.IReactorySupportTicket>[]) => void;
  onCancel: () => void;
}

/**
 * BulkTagAction Component
 * 
 * Dialog for adding/removing tags from multiple support tickets.
 * 
 * Features:
 * - Add or remove mode toggle
 * - Tag input with suggestions
 * - Preview of existing tags
 * - Progress tracking
 * - Error handling with retry
 * - Success/failure summary
 * 
 * @example
 * <BulkTagAction
 *   selectedTickets={[ticket1, ticket2]}
 *   onComplete={(updated) => console.log(updated)}
 *   onCancel={() => console.log('cancelled')}
 * />
 */
const BulkTagAction = (props: BulkTagActionProps) => {
  const { reactory, selectedTickets, onComplete, onCancel } = props;

  // Get dependencies from registry
  const {
    React,
    Material,
  } = reactory.getComponents<BulkTagActionDependencies>([
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
    ToggleButtonGroup,
    ToggleButton,
    Autocomplete,
  } = MaterialCore;

  // Loading check
  if (!React || !Material) {
    return null;
  }

  const [mode, setMode] = React.useState<'add' | 'remove'>('add');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [availableTags, setAvailableTags] = React.useState<string[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [errors, setErrors] = React.useState<Array<{ ticket: any; error: string }>>([]);
  const [completed, setCompleted] = React.useState(false);

  // Load available tags
  React.useEffect(() => {
    const loadTags = async () => {
      try {
        const result = await reactory.graphqlQuery(
          `query GetAvailableTags {
            supportTicketTags {
              tag
              count
            }
          }`
        );

        if (result.data?.supportTicketTags) {
          setAvailableTags(result.data.supportTicketTags.map((t: any) => t.tag));
        }
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };

    loadTags();
  }, []);

  // Extract common tags from selected tickets
  const commonTags = React.useMemo(() => {
    if (selectedTickets.length === 0) return [];
    
    const tagSets = selectedTickets.map(ticket => new Set(ticket.tags || []));
    const common = Array.from(tagSets[0]).filter(tag => 
      tagSets.every(set => set.has(tag))
    );
    
    return common;
  }, [selectedTickets]);

  const handleApplyTags = async () => {
    if (selectedTags.length === 0) return;

    setProcessing(true);
    setErrors([]);
    setProgress(0);

    const results: Partial<Reactory.Models.IReactorySupportTicket>[] = [];
    const failed: Array<{ ticket: any; error: string }> = [];

    for (let i = 0; i < selectedTickets.length; i++) {
      const ticket = selectedTickets[i];
      
      try {
        // Calculate new tags based on mode
        let newTags: string[];
        if (mode === 'add') {
          // Add tags (union)
          newTags = Array.from(new Set([...(ticket.tags || []), ...selectedTags]));
        } else {
          // Remove tags
          newTags = (ticket.tags || []).filter(tag => !selectedTags.includes(tag));
        }

        // Call GraphQL mutation to update tags
        const result = await reactory.graphqlMutation(
          `mutation UpdateTicketTags($id: String!, $tags: [String!]!) {
            updateSupportTicketTags(id: $id, tags: $tags) {
              id
              tags
              updatedDate
            }
          }`,
          {
            id: ticket.id,
            tags: newTags,
          }
        );

        if (result.data?.updateSupportTicketTags) {
          results.push({
            ...ticket,
            tags: result.data.updateSupportTicketTags.tags,
            updatedDate: result.data.updateSupportTicketTags.updatedDate,
          });
        } else {
          throw new Error('Failed to update ticket tags');
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
    handleApplyTags();
  };

  const handleAddTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
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
          <Icon>label</Icon>
          <Typography variant="h6">
            Manage Tags for {selectedTickets.length} Ticket{selectedTickets.length > 1 ? 's' : ''}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {!completed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Mode Toggle */}
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, newMode) => newMode && setMode(newMode)}
              fullWidth
              disabled={processing}
            >
              <ToggleButton value="add">
                <Icon sx={{ mr: 1 }}>add</Icon>
                Add Tags
              </ToggleButton>
              <ToggleButton value="remove">
                <Icon sx={{ mr: 1 }}>remove</Icon>
                Remove Tags
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Tag Input */}
            <Autocomplete
              freeSolo
              options={mode === 'remove' ? commonTags : availableTags}
              value={tagInput}
              onChange={(e, newValue) => {
                if (newValue) {
                  handleAddTag(newValue);
                }
              }}
              onInputChange={(e, newValue) => setTagInput(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={mode === 'add' ? 'Add Tags' : 'Remove Tags'}
                  placeholder={mode === 'add' ? 'Type to search or create...' : 'Select tags to remove...'}
                  disabled={processing}
                />
              )}
              disabled={processing}
            />

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {mode === 'add' ? 'Tags to Add:' : 'Tags to Remove:'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedTags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      color={mode === 'add' ? 'primary' : 'error'}
                      disabled={processing}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Common Tags (for remove mode) */}
            {mode === 'remove' && commonTags.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Common Tags (present in all selected tickets):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {commonTags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onClick={() => !selectedTags.includes(tag) && handleAddTag(tag)}
                      variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                      disabled={processing}
                    />
                  ))}
                </Box>
              </Box>
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
                          {ticket.tags && ticket.tags.length > 0 && (
                            <Chip
                              label={`${ticket.tags.length} tag${ticket.tags.length > 1 ? 's' : ''}`}
                              size="small"
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
                Successfully {mode === 'add' ? 'added' : 'removed'} tags for {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''}
              </Alert>
            ) : (
              <>
                {/* Partial Success */}
                <Alert severity="warning" icon={<Icon>warning</Icon>}>
                  Updated {selectedTickets.length - errors.length} of {selectedTickets.length} tickets
                </Alert>

                {/* Error List */}
                <Box>
                  <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                    Failed Updates:
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
              onClick={handleApplyTags}
              variant="contained"
              disabled={selectedTags.length === 0 || processing}
              startIcon={processing ? <Icon>hourglass_empty</Icon> : <Icon>check</Icon>}
            >
              {processing ? 'Processing...' : mode === 'add' ? 'Add Tags' : 'Remove Tags'}
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
  name: 'BulkTagAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: BulkTagAction,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    BulkTagAction,
    ['Support Tickets', 'Bulk Actions', 'Tags'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: BulkTagAction 
  });
}

export default BulkTagAction;
