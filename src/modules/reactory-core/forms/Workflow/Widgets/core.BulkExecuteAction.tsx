import Reactory from '@reactory/reactory-core';

interface BulkExecuteActionProps {
  reactory: Reactory.Client.IReactoryApi;
  selectedWorkflows: any[];
  onComplete: () => void;
  onCancel: () => void;
}

const BulkExecuteAction = (props: BulkExecuteActionProps) => {
  const { reactory, selectedWorkflows, onComplete, onCancel } = props;

  const { React, Material } = reactory.getComponents<any>(['react.React', 'material-ui.Material']);
  const { MaterialCore } = Material;
  const { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, List, ListItem, ListItemText, CircularProgress, Alert, Icon, Box, Checkbox, FormControlLabel } = MaterialCore;

  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [useDefaultInput, setUseDefaultInput] = React.useState(true);

  const handleConfirm = async () => {
    setProcessing(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        selectedWorkflows.map(async (workflow) => {
          const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;
          const result = await reactory.graphqlMutation(`
            mutation StartWorkflow($workflowId: String!, $input: WorkflowExecutionInput) {
              startWorkflow(workflowId: $workflowId, input: $input) {
                id
                status
              }
            }
          `, {
            workflowId,
            input: {
              input: {},
              tags: ['bulk-execution'],
              priority: 1
            }
          });

          if (!result.data?.startWorkflow) {
            throw new Error('Failed to start workflow');
          }
          return { workflow, instance: result.data.startWorkflow };
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded > 0) {
        reactory.createNotification(
          `Started ${succeeded} workflow${succeeded > 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
          { type: succeeded === selectedWorkflows.length ? 'success' : 'warning' }
        );
      }
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to execute workflows');
      reactory.createNotification('Failed to execute workflows', { type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon color="primary">play_arrow</Icon>
          Execute Workflows
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body1" sx={{ mb: 2 }}>
          Execute the following {selectedWorkflows.length} workflow{selectedWorkflows.length > 1 ? 's' : ''}:
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
        <FormControlLabel
          control={<Checkbox checked={useDefaultInput} onChange={(e) => setUseDefaultInput(e.target.checked)} />}
          label="Use empty input for all workflows"
          sx={{ mt: 2 }}
        />
        <Alert severity="info" sx={{ mt: 2 }}>
          Workflows will start with empty input parameters and be tagged as "bulk-execution".
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={processing}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={processing}
          startIcon={processing ? <CircularProgress size={20} /> : <Icon>play_arrow</Icon>}
        >
          {processing ? 'Starting...' : 'Execute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'BulkExecuteAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: BulkExecuteAction,
  roles: ['ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(Definition.nameSpace, Definition.name, Definition.version, BulkExecuteAction, ['Workflow', 'Bulk Action'], Definition.roles, true, [], 'widget');
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, component: BulkExecuteAction });
}


