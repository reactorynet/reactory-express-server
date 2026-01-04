import Reactory from '@reactory/reactory-core';

interface BulkActivateActionProps {
  reactory: Reactory.Client.IReactoryApi;
  selectedWorkflows: any[];
  onComplete: () => void;
  onCancel: () => void;
}

/**
 * BulkActivateAction Component
 * 
 * Modal dialog for activating multiple workflows at once
 */
const BulkActivateAction = (props: BulkActivateActionProps) => {
  const { reactory, selectedWorkflows, onComplete, onCancel } = props;

  const { React, Material } = reactory.getComponents<any>([
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
    Typography,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert,
    Icon,
    Box
  } = MaterialCore;

  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Process each workflow
      const results = await Promise.allSettled(
        selectedWorkflows.map(async (workflow) => {
          const result = await reactory.graphqlMutation(`
            mutation ActivateWorkflow($nameSpace: String!, $name: String!) {
              activateWorkflow(nameSpace: $nameSpace, name: $name) {
                success
                message
              }
            }
          `, {
            nameSpace: workflow.nameSpace,
            name: workflow.name
          });

          if (!result.data?.activateWorkflow?.success) {
            throw new Error(result.data?.activateWorkflow?.message || 'Failed to activate');
          }

          return { workflow, success: true };
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded > 0) {
        reactory.createNotification(
          `Successfully activated ${succeeded} workflow${succeeded > 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
          { type: succeeded === selectedWorkflows.length ? 'success' : 'warning' }
        );
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to activate workflows');
      reactory.createNotification('Failed to activate workflows', { type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon color="success">check_circle</Icon>
          Activate Workflows
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" sx={{ mb: 2 }}>
          Are you sure you want to activate the following {selectedWorkflows.length} workflow{selectedWorkflows.length > 1 ? 's' : ''}?
        </Typography>

        <List dense sx={{ maxHeight: 300, overflow: 'auto', bgcolor: '#f5f5f5', borderRadius: 1 }}>
          {selectedWorkflows.map((workflow, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={`${workflow.nameSpace}.${workflow.name}@${workflow.version}`}
                primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                secondary={workflow.description || 'No description'}
              />
            </ListItem>
          ))}
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          Active workflows will be available for execution and scheduling.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="success"
          disabled={processing}
          startIcon={processing ? <CircularProgress size={20} /> : <Icon>check_circle</Icon>}
        >
          {processing ? 'Activating...' : 'Activate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'BulkActivateAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: BulkActivateAction,
  roles: ['ADMIN', 'WORKFLOW_ADMIN']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    BulkActivateAction,
    ['Workflow', 'Bulk Action'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: BulkActivateAction 
  });
}


