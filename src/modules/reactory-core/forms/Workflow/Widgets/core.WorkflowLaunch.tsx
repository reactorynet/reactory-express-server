import Reactory from '@reactory/reactory-core';
import { WorkflowLaunchProps } from './types';

/**
 * WorkflowLaunch Component
 * 
 * Embeds the WorkflowLauncher form for executing workflows
 */
const WorkflowLaunch = (props: WorkflowLaunchProps) => {
  const { reactory, workflow } = props;

  const { React, Material } = reactory.getComponents<any>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, Icon, Button, TextField, Alert, CircularProgress } = MaterialCore;

  const [inputData, setInputData] = React.useState('{}');
  const [executing, setExecuting] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const executeWorkflow = async () => {
    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      // Parse input JSON
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(inputData);
      } catch (e) {
        throw new Error('Invalid JSON input');
      }

      const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;

      const response = await reactory.graphqlMutation(`
        mutation StartWorkflow($workflowId: String!, $input: WorkflowExecutionInput) {
          startWorkflow(workflowId: $workflowId, input: $input) {
            id
            workflowName
            nameSpace
            status
            startTime
          }
        }
      `, {
        workflowId,
        input: {
          input: parsedInput,
          tags: [`launched-from-ui`],
          priority: 1
        }
      });

      if (response.data?.startWorkflow) {
        setResult(response.data.startWorkflow);
        reactory.createNotification('Workflow started successfully', { type: 'success' });
      } else {
        throw new Error('Failed to start workflow');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute workflow');
      reactory.createNotification('Failed to start workflow', { type: 'error' });
      reactory.log('Error executing workflow', err, 'error');
    } finally {
      setExecuting(false);
    }
  };

  const viewInstance = () => {
    if (result?.id) {
      reactory.navigation(`/workflows/instances/${result.id}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Icon>play_circle</Icon>
        <Typography variant="h6">
          Launch Workflow
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Execute this workflow with custom input parameters. The workflow will run asynchronously.
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Workflow ID
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            p: 1.5, 
            bgcolor: '#f5f5f5', 
            fontFamily: 'monospace',
            borderRadius: 1
          }}
        >
          {workflow.nameSpace}.{workflow.name}@{workflow.version}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Input Parameters (JSON)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={10}
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder='{\n  "key": "value"\n}'
          variant="outlined"
          sx={{ 
            fontFamily: 'monospace',
            '& textarea': { fontFamily: 'monospace' }
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Enter workflow input as JSON. Leave empty for no input parameters.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={viewInstance}>
              View
            </Button>
          }
        >
          <Typography variant="subtitle2">Workflow Started</Typography>
          <Typography variant="caption" display="block">
            Instance ID: {result.id}
          </Typography>
          <Typography variant="caption" display="block">
            Status: {result.status}
          </Typography>
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={executing ? <CircularProgress size={20} /> : <Icon>play_arrow</Icon>}
          onClick={executeWorkflow}
          disabled={executing}
        >
          {executing ? 'Starting...' : 'Start Workflow'}
        </Button>

        {result && (
          <Button
            variant="outlined"
            startIcon={<Icon>visibility</Icon>}
            onClick={viewInstance}
          >
            View Instance
          </Button>
        )}
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowLaunch',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowLaunch,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowLaunch,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowLaunch 
  });
}
