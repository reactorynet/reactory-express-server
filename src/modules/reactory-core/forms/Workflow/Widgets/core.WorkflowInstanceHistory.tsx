import Reactory from '@reactory/reactory-core';
import { WorkflowInstanceHistoryProps } from './types';

/**
 * WorkflowInstanceHistory Component
 * 
 * Displays recent execution history for the workflow
 */
const WorkflowInstanceHistory = (props: WorkflowInstanceHistoryProps) => {
  const { reactory, workflow, refreshKey } = props;

  const { React, Material } = reactory.getComponents<any>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Icon, 
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Tooltip
  } = MaterialCore;

  const [instances, setInstances] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch instances
  React.useEffect(() => {
    const fetchInstances = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await reactory.graphqlQuery(`
          query WorkflowInstances($filter: InstanceFilterInput, $pagination: PaginationInput) {
            workflowInstances(filter: $filter, pagination: $pagination) {
              instances {
                id
                status
                progress
                startTime
                endTime
                duration
                createdBy
                error {
                  message
                  code
                }
              }
            }
          }
        `, {
          filter: {
            workflowName: workflow.name,
            nameSpace: workflow.nameSpace
          },
          pagination: {
            page: 1,
            limit: 10
          }
        });

        if (result.data?.workflowInstances?.instances) {
          setInstances(result.data.workflowInstances.instances);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load instances');
        reactory.log('Error fetching workflow instances', err, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInstances();
  }, [workflow.name, workflow.nameSpace, refreshKey]);

  const getStatusColor = (status: string) => {
    const colorMap: any = {
      'PENDING': 'default',
      'RUNNING': 'primary',
      'COMPLETED': 'success',
      'FAILED': 'error',
      'PAUSED': 'warning',
      'CANCELLED': 'default'
    };
    return colorMap[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    const iconMap: any = {
      'PENDING': 'schedule',
      'RUNNING': 'play_circle',
      'COMPLETED': 'check_circle',
      'FAILED': 'error',
      'PAUSED': 'pause_circle',
      'CANCELLED': 'cancel'
    };
    return iconMap[status] || 'help';
  };

  const formatDuration = (ms: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const viewInstance = (instanceId: string) => {
    reactory.navigation(`/workflows/instances/${instanceId}`);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Icon sx={{ fontSize: 48, color: 'error.main' }}>error</Icon>
        <Typography variant="h6" color="error" sx={{ mt: 2 }}>
          Failed to load instances
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
      </Box>
    );
  }

  if (instances.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Icon sx={{ fontSize: 48, color: 'text.secondary' }}>history</Icon>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
          No execution history
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This workflow hasn't been executed yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Recent Executions ({instances.length})
        </Typography>
        <Tooltip title="View all instances">
          <IconButton 
            size="small"
            onClick={() => reactory.navigation('/workflows/instances', {
              state: {
                filter: {
                  workflowName: workflow.name,
                  nameSpace: workflow.nameSpace
                }
              }
            })}
          >
            <Icon>open_in_new</Icon>
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Status</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {instances.map((instance: any) => (
              <TableRow 
                key={instance.id}
                hover
                sx={{ 
                  '&:last-child td, &:last-child th': { border: 0 },
                  cursor: 'pointer'
                }}
                onClick={() => viewInstance(instance.id)}
              >
                <TableCell>
                  <Chip
                    icon={<Icon>{getStatusIcon(instance.status)}</Icon>}
                    label={instance.status}
                    size="small"
                    color={getStatusColor(instance.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {formatRelativeTime(instance.startTime)}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {new Date(instance.startTime).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDuration(instance.duration)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {instance.progress !== null && instance.progress !== undefined ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box 
                        sx={{ 
                          width: 60, 
                          height: 6, 
                          bgcolor: '#e0e0e0', 
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <Box 
                          sx={{ 
                            width: `${instance.progress}%`, 
                            height: '100%', 
                            bgcolor: getStatusColor(instance.status) === 'success' ? '#4caf50' : 
                                     getStatusColor(instance.status) === 'error' ? '#f44336' : '#2196f3'
                          }} 
                        />
                      </Box>
                      <Typography variant="caption">{Math.round(instance.progress)}%</Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">N/A</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {instance.createdBy || 'System'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View details">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewInstance(instance.id);
                      }}
                    >
                      <Icon sx={{ fontSize: 18 }}>visibility</Icon>
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowInstanceHistory',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowInstanceHistory,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowInstanceHistory,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowInstanceHistory 
  });
}
