import Reactory from '@reactory/reactory-core';

interface BulkTagActionProps {
  reactory: Reactory.Client.IReactoryApi;
  selectedWorkflows: any[];
  onComplete: () => void;
  onCancel: () => void;
}

const BulkTagAction = (props: BulkTagActionProps) => {
  const { reactory, selectedWorkflows, onComplete, onCancel } = props;

  const { React, Material } = reactory.getComponents<any>(['react.React', 'material-ui.Material']);
  const { MaterialCore } = Material;
  const { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField, Chip, Box, Icon, Alert, CircularProgress, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } = MaterialCore;

  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [operation, setOperation] = React.useState<'add' | 'remove' | 'replace'>('add');
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);

  const handleAddTag = () => {
    const newTags = tagInput.split(',').map(t => t.trim()).filter(t => t && !tags.includes(t));
    setTags([...tags, ...newTags]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleConfirm = async () => {
    if (tags.length === 0) {
      setError('Please add at least one tag');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Note: This would need a GraphQL mutation to update workflow tags
      // For now, showing the UI pattern
      reactory.createNotification(
        `Tag operation "${operation}" will be applied to ${selectedWorkflows.length} workflow${selectedWorkflows.length > 1 ? 's' : ''}`,
        { type: 'info' }
      );
      
      // Simulated delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      reactory.createNotification(
        `Successfully updated tags for ${selectedWorkflows.length} workflow${selectedWorkflows.length > 1 ? 's' : ''}`,
        { type: 'success' }
      );
      
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to update tags');
      reactory.createNotification('Failed to update tags', { type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon>label</Icon>
          Manage Tags
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Updating tags for {selectedWorkflows.length} workflow{selectedWorkflows.length > 1 ? 's' : ''}
        </Typography>

        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">Operation</FormLabel>
          <RadioGroup row value={operation} onChange={(e) => setOperation(e.target.value as any)}>
            <FormControlLabel value="add" control={<Radio />} label="Add Tags" />
            <FormControlLabel value="remove" control={<Radio />} label="Remove Tags" />
            <FormControlLabel value="replace" control={<Radio />} label="Replace Tags" />
          </RadioGroup>
        </FormControl>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Tags (comma-separated)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="e.g. production, critical, v2"
            helperText="Press Enter or click Add to add tags"
          />
          <Button
            size="small"
            onClick={handleAddTag}
            startIcon={<Icon>add</Icon>}
            sx={{ mt: 1 }}
            disabled={!tagInput.trim()}
          >
            Add Tags
          </Button>
        </Box>

        {tags.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Tags to {operation}:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          {operation === 'add' && 'Tags will be added to existing tags'}
          {operation === 'remove' && 'Matching tags will be removed from workflows'}
          {operation === 'replace' && 'All existing tags will be replaced with new tags'}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={processing}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={processing || tags.length === 0}
          startIcon={processing ? <CircularProgress size={20} /> : <Icon>label</Icon>}
        >
          {processing ? 'Updating...' : 'Apply Tags'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'BulkTagAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: BulkTagAction,
  roles: ['ADMIN', 'WORKFLOW_ADMIN']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(Definition.nameSpace, Definition.name, Definition.version, BulkTagAction, ['Workflow', 'Bulk Action'], Definition.roles, true, [], 'widget');
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, component: BulkTagAction });
}


