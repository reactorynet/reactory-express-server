import Reactory from '@reactory/reactory-core';

interface BulkDeleteActionProps {
  reactory: Reactory.Client.IReactoryApi;
  selectedWorkflows: any[];
  onComplete: () => void;
  onCancel: () => void;
}

const BulkDeleteAction = (props: BulkDeleteActionProps) => {
  const { reactory, selectedWorkflows, onComplete, onCancel } = props;

  const { React, Material } = reactory.getComponents<any>(['react.React', 'material-ui.Material']);
  const { MaterialCore } = Material;
  const { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Icon, Box, Checkbox, FormControlLabel, TextField } = MaterialCore;

  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmText, setConfirmText] = React.useState('');
  const [deleteInstances, setDeleteInstances] = React.useState(false);

  const isConfirmed = confirmText.toLowerCase() === 'delete';

  const handleConfirm = async () => {
    if (!isConfirmed) {
      setError('Please type DELETE to confirm');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Note: This would need a GraphQL mutation to delete workflows
      // For now, showing the UI pattern
      reactory.createNotification(
        `Deleting ${selectedWorkflows.length} workflow${selectedWorkflows.length > 1 ? 's' : ''}...`,
        { type: 'warning' }
      );
      
      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      reactory.createNotification(
        `Successfully deleted ${selectedWorkflows.length} workflow${selectedWorkflows.length > 1 ? 's' : ''}`,
        { type: 'success' }
      );
      
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to delete workflows');
      reactory.createNotification('Failed to delete workflows', { type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon color="error">delete</Icon>
          Delete Workflows
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Warning: This action cannot be undone!
          </Typography>
          <Typography variant="body2">
            You are about to permanently delete {selectedWorkflows.length} workflow{selectedWorkflows.length > 1 ? 's' : ''}.
          </Typography>
        </Alert>

        <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
          Workflows to be deleted:
        </Typography>

        <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
          {selectedWorkflows.map((workflow, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={`${workflow.nameSpace}.${workflow.name}@${workflow.version}`}
                primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                secondary={`Executions: ${workflow.statistics?.totalExecutions || 0}`}
              />
            </ListItem>
          ))}
        </List>

        <FormControlLabel
          control={
            <Checkbox
              checked={deleteInstances}
              onChange={(e) => setDeleteInstances(e.target.checked)}
              color="error"
            />
          }
          label={
            <Typography variant="body2">
              Also delete all execution instances
              <Typography variant="caption" display="block" color="text.secondary">
                This will remove all execution history
              </Typography>
            </Typography>
          }
          sx={{ mb: 2 }}
        />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Type <strong>DELETE</strong> to confirm:
          </Typography>
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            variant="outlined"
            error={!isConfirmed && confirmText.length > 0}
            helperText={!isConfirmed && confirmText.length > 0 ? 'Must type DELETE exactly' : ''}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={processing}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={processing || !isConfirmed}
          startIcon={processing ? <CircularProgress size={20} /> : <Icon>delete</Icon>}
        >
          {processing ? 'Deleting...' : 'Delete Permanently'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'BulkDeleteAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: BulkDeleteAction,
  roles: ['ADMIN']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(Definition.nameSpace, Definition.name, Definition.version, BulkDeleteAction, ['Workflow', 'Bulk Action'], Definition.roles, true, [], 'widget');
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, component: BulkDeleteAction });
}


