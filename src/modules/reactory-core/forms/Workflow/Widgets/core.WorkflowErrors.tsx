import Reactory from '@reactory/reactory-core';
import { WorkflowErrorsProps } from './types';

/**
 * WorkflowErrors Component
 * 
 * Displays error statistics and recent errors for the workflow
 */
const WorkflowErrors = (props: WorkflowErrorsProps) => {
  const { reactory, workflow } = props;

  const { React, Material } = reactory.getComponents<any>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Icon, 
    Alert,
    AlertTitle,
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip
  } = MaterialCore;

  const [errors, setErrors] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Fetch error statistics
    // This is a placeholder - replace with actual API call
    setErrors([]);
  }, [workflow.name]);

  const failedExecutions = workflow.statistics?.failedExecutions || 0;

  if (failedExecutions === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Icon sx={{ fontSize: 48, color: 'success.main' }}>check_circle</Icon>
        <Typography variant="h6" color="success.main" sx={{ mt: 2 }}>
          No Errors
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This workflow has no failed executions
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>Error Summary</AlertTitle>
        This workflow has <strong>{failedExecutions}</strong> failed execution(s).
        Review the instances tab for detailed error information.
      </Alert>

      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        Error Statistics
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2">Total Failed Executions</Typography>
          <Chip label={failedExecutions} color="error" />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2">Success Rate</Typography>
          <Chip 
            label={`${Math.round(((workflow.statistics?.successfulExecutions || 0) / (workflow.statistics?.totalExecutions || 1)) * 100)}%`}
            color={(workflow.statistics?.successfulExecutions || 0) / (workflow.statistics?.totalExecutions || 1) > 0.8 ? 'success' : 'warning'}
          />
        </Box>
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowErrors',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowErrors,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowErrors,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowErrors 
  });
}
