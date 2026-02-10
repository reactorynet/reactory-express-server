import { WorkflowInstanceHistoryProps } from './types';

/**
 * Status mapping from workflow-es numeric status to labels
 */
const WORKFLOW_ES_STATUS: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: 'PENDING', color: 'default', icon: 'schedule' },
  1: { label: 'RUNNING', color: 'primary', icon: 'play_circle' },
  2: { label: 'COMPLETE', color: 'success', icon: 'check_circle' },
  3: { label: 'TERMINATED', color: 'error', icon: 'error' },
  4: { label: 'SUSPENDED', color: 'warning', icon: 'pause_circle' },
};

/**
 * WorkflowInstanceHistory Component
 * 
 * Displays both running in-memory instances and persisted execution history for a workflow.
 * Combines data from two sources:
 * 1. In-memory instances (active/running workflows)
 * 2. MongoDB persisted history (completed/terminated workflows)
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
    Tooltip,
    Tabs,
    Tab,
    Badge,
    Alert,
    TablePagination,
    Checkbox,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Toolbar,
    alpha,
  } = MaterialCore;

  const theme = reactory.muiTheme;  
  const isDarkmode = theme.palette.mode === 'dark';
  reactory.log('Rendering WorkflowInstanceHistory', { workflow, refreshKey, theme }, 'debug');
  // State for in-memory instances
  const [activeInstances, setActiveInstances] = React.useState([]);
  const [activeLoading, setActiveLoading] = React.useState(true);
  const [activeError, setActiveError] = React.useState(null);

  // State for execution history (MongoDB)
  const [history, setHistory] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [historyError, setHistoryError] = React.useState(null);
  const [historyPagination, setHistoryPagination] = React.useState({
    page: 0,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Tab state
  const [activeTab, setActiveTab] = React.useState(0);

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState(new Set());

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteDialogType, setDeleteDialogType] = React.useState('single'); // 'single', 'batch', 'clear'
  const [deleteTargetId, setDeleteTargetId] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // Refresh trigger
  const [localRefreshKey, setLocalRefreshKey] = React.useState(0);

  // Build the workflow definition ID for querying history
  const workflowDefinitionId = workflow.id || `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;

  // Fetch active in-memory instances
  React.useEffect(() => {
    const fetchActiveInstances = async () => {
      setActiveLoading(true);
      setActiveError(null);

      try {
        const result = await reactory.graphqlQuery(`
          query WorkflowInstances($filter: InstanceFilterInput, $pagination: PaginationInput) {
            workflowInstances(filter: $filter, pagination: $pagination) {
              instances {
                id
                workflowName
                nameSpace
                version
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
              pagination {
                total
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
            limit: 50
          }
        });

        const data = result.data as any;
        if (data?.workflowInstances?.instances) {
          setActiveInstances(data.workflowInstances.instances);
        }
      } catch (err: any) {
        setActiveError(err.message || 'Failed to load active instances');
        reactory.log('Error fetching active workflow instances', err, 'error');
      } finally {
        setActiveLoading(false);
      }
    };

    fetchActiveInstances();
  }, [workflow.name, workflow.nameSpace, refreshKey, localRefreshKey]);

  // Fetch execution history from MongoDB
  React.useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const result = await reactory.graphqlQuery(`
          query WorkflowExecutionHistory($workflowDefinitionId: String!, $pagination: WorkflowHistoryPaginationInput) {
            workflowExecutionHistoryByDefinitionId(
              workflowDefinitionId: $workflowDefinitionId,
              pagination: $pagination
            ) {
              instances {
                id
                workflowDefinitionId
                version
                status
                statusLabel
                description
                createTime
                completeTime
                duration
                data
                stepCount
                completedStepCount
                failedStepCount
                executionPointers {
                  id
                  stepId
                  status
                  statusLabel
                  startTime
                  endTime
                  duration
                  retryCount
                  active
                }
              }
              pagination {
                page
                pages
                limit
                total
              }
            }
          }
        `, {
          workflowDefinitionId,
          pagination: {
            page: historyPagination.page + 1, // GraphQL uses 1-based pages
            limit: historyPagination.limit,
            sortField: 'createTime',
            sortOrder: 'DESC'
          }
        });

        const data = result.data as any;
        if (data?.workflowExecutionHistoryByDefinitionId) {
          const { instances, pagination } = data.workflowExecutionHistoryByDefinitionId;
          setHistory(instances || []);
          setHistoryPagination((prev: typeof historyPagination) => ({
            ...prev,
            total: pagination.total,
            pages: pagination.pages,
          }));
        }
      } catch (err: any) {
        setHistoryError(err.message || 'Failed to load execution history');
        reactory.log('Error fetching workflow execution history', err, 'error');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [workflowDefinitionId, historyPagination.page, historyPagination.limit, refreshKey, localRefreshKey]);

  // Clear selection when history changes
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [history]);

  const getStatusColor = (status: string | number) => {
    if (typeof status === 'number') {
      return WORKFLOW_ES_STATUS[status]?.color || 'default';
    }
    const colorMap: any = {
      'PENDING': 'default',
      'RUNNING': 'primary',
      'COMPLETED': 'success',
      'COMPLETE': 'success',
      'FAILED': 'error',
      'TERMINATED': 'error',
      'PAUSED': 'warning',
      'SUSPENDED': 'warning',
      'CANCELLED': 'default'
    };
    return colorMap[status] || 'default';
  };

  const getStatusIcon = (status: string | number) => {
    if (typeof status === 'number') {
      return WORKFLOW_ES_STATUS[status]?.icon || 'help';
    }
    const iconMap: any = {
      'PENDING': 'schedule',
      'RUNNING': 'play_circle',
      'COMPLETED': 'check_circle',
      'COMPLETE': 'check_circle',
      'FAILED': 'error',
      'TERMINATED': 'error',
      'PAUSED': 'pause_circle',
      'SUSPENDED': 'pause_circle',
      'CANCELLED': 'cancel'
    };
    return iconMap[status] || 'help';
  };

  const getStatusLabel = (status: string | number) => {
    if (typeof status === 'number') {
      return WORKFLOW_ES_STATUS[status]?.label || 'UNKNOWN';
    }
    return status;
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    if (seconds > 0) return `${seconds}s`;
    return `${ms}ms`;
  };

  const formatRelativeTime = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
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

  const formatDateTime = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const viewInstance = (instanceId: string) => {
    reactory.navigation(`/workflows/instances/${instanceId}`);
  };

  const handleTabChange = (_event: any, newValue: number) => {
    setActiveTab(newValue);
    setLocalRefreshKey((prev: number) => prev + 1);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setHistoryPagination((prev: typeof historyPagination) => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event: any) => {
    setHistoryPagination((prev: typeof historyPagination) => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0,
    }));
  };

  // Selection handlers
  const handleSelectAll = (event: any) => {
    if (event.target.checked) {
      const newSelected = new Set(history.map((h: any) => h.id));
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const isSelected = (id: string) => selectedIds.has(id);

  // Delete handlers
  const openDeleteDialog = (type: string, targetId: string | null = null) => {
    setDeleteDialogType(type);
    setDeleteTargetId(targetId);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      let result;
      
      if (deleteDialogType === 'single' && deleteTargetId) {
        result = await reactory.graphqlMutation(`
          mutation DeleteWorkflowExecutionHistory($instanceId: String!) {
            deleteWorkflowExecutionHistory(instanceId: $instanceId) {
              success
              message
              data
            }
          }
        `, { instanceId: deleteTargetId });
      } else if (deleteDialogType === 'batch') {
        const instanceIds = Array.from(selectedIds);
        result = await reactory.graphqlMutation(`
          mutation DeleteWorkflowExecutionHistoryBatch($instanceIds: [String!]!) {
            deleteWorkflowExecutionHistoryBatch(instanceIds: $instanceIds) {
              success
              message
              data
            }
          }
        `, { instanceIds });
      } else if (deleteDialogType === 'clear') {
        result = await reactory.graphqlMutation(`
          mutation ClearWorkflowExecutionHistory($workflowDefinitionId: String!) {
            clearWorkflowExecutionHistory(workflowDefinitionId: $workflowDefinitionId) {
              success
              message
              data
            }
          }
        `, { workflowDefinitionId });
      }

      const data = result?.data as any;
      const operationResult = data?.deleteWorkflowExecutionHistory || 
                              data?.deleteWorkflowExecutionHistoryBatch || 
                              data?.clearWorkflowExecutionHistory;
      
      if (operationResult?.success) {
        reactory.createNotification(`Successfully deleted workflow history`, { type: 'success' });
        setSelectedIds(new Set());
        setLocalRefreshKey((prev: number) => prev + 1);
      } else {
        reactory.createNotification(operationResult?.message || 'Failed to delete', { type: 'error' });
      }
    } catch (error: any) {
      reactory.log('Error deleting workflow history', error, 'error');
      reactory.createNotification(`Error: ${error.message}`, { type: 'error' });
    } finally {
      setDeleting(false);
      closeDeleteDialog();
    }
  };

  // Count running instances for badge
  const runningCount = activeInstances.filter((i: any) => 
    i.status === 'RUNNING' || i.status === 'PENDING'
  ).length;

  const numSelected = selectedIds.size;
  const rowCount = history.length;

  debugger;
  // Theme-aware styles
  const headerBgColor = isDarkmode 
    ? theme.palette.grey[800]
    : theme.palette.grey[100];

  const progressBarBgColor = theme.palette.mode === 'dark'
    ? theme.palette.grey[700]
    : theme.palette.grey[300];

  // Render selection toolbar
  const renderSelectionToolbar = () => {
    if (numSelected === 0) return null;

    return (
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.08),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          sx={{ flex: '1 1 100%' }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          {numSelected} selected
        </Typography>
        <Tooltip title="Delete selected">
          <Button
            color="error"
            startIcon={<Icon>delete</Icon>}
            onClick={() => openDeleteDialog('batch')}
            size="small"
          >
            Delete Selected
          </Button>
        </Tooltip>
      </Toolbar>
    );
  };

  // Render active instances table
  const renderActiveInstances = () => {
    if (activeLoading) {
      return (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (activeError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {activeError}
        </Alert>
      );
    }

    if (activeInstances.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Icon sx={{ fontSize: 48, color: 'text.secondary' }}>hourglass_empty</Icon>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            No active instances
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There are no running or pending instances for this workflow
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: headerBgColor }}>
              <TableCell>Status</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeInstances.map((instance: any) => (
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
                    label={getStatusLabel(instance.status)}
                    size="small"
                    color={getStatusColor(instance.status) as any}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {formatRelativeTime(instance.startTime)}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {formatDateTime(instance.startTime)}
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
                          bgcolor: progressBarBgColor, 
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <Box 
                          sx={{ 
                            width: `${instance.progress}%`, 
                            height: '100%', 
                            bgcolor: getStatusColor(instance.status) === 'success' 
                              ? theme.palette.success.main 
                              : getStatusColor(instance.status) === 'error' 
                                ? theme.palette.error.main 
                                : theme.palette.primary.main
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
                      onClick={(e: any) => {
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
    );
  };

  // Render execution history table
  const renderHistory = () => {
    if (historyLoading) {
      return (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (historyError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {historyError}
        </Alert>
      );
    }

    if (history.length === 0) {
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
      <>
        {renderSelectionToolbar()}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: headerBgColor }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={numSelected > 0 && numSelected < rowCount}
                    checked={rowCount > 0 && numSelected === rowCount}
                    onChange={handleSelectAll}
                    inputProps={{ 'aria-label': 'select all' }}
                  />
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Steps</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((execution: any) => {
                const isItemSelected = isSelected(execution.id);
                return (
                  <TableRow 
                    key={execution.id}
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    selected={isItemSelected}
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      cursor: 'pointer'
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onClick={(e: any) => {
                          e.stopPropagation();
                          handleSelectOne(execution.id);
                        }}
                        inputProps={{ 'aria-labelledby': `select-${execution.id}` }}
                      />
                    </TableCell>
                    <TableCell onClick={() => viewInstance(execution.id)}>
                      <Chip
                        icon={<Icon>{getStatusIcon(execution.status)}</Icon>}
                        label={execution.statusLabel || getStatusLabel(execution.status)}
                        size="small"
                        color={getStatusColor(execution.status) as any}
                      />
                    </TableCell>
                    <TableCell onClick={() => viewInstance(execution.id)}>
                      <Typography variant="caption">
                        {formatRelativeTime(execution.createTime)}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {formatDateTime(execution.createTime)}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => viewInstance(execution.id)}>
                      {execution.completeTime ? (
                        <>
                          <Typography variant="caption">
                            {formatRelativeTime(execution.completeTime)}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {formatDateTime(execution.completeTime)}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell onClick={() => viewInstance(execution.id)}>
                      <Typography variant="body2">
                        {formatDuration(execution.duration)}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={() => viewInstance(execution.id)}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title={`${execution.completedStepCount} completed`}>
                          <Chip
                            size="small"
                            label={execution.completedStepCount}
                            color="success"
                            variant="outlined"
                            sx={{ minWidth: 32, height: 20, '& .MuiChip-label': { px: 0.5 } }}
                          />
                        </Tooltip>
                        {execution.failedStepCount > 0 && (
                          <Tooltip title={`${execution.failedStepCount} failed`}>
                            <Chip
                              size="small"
                              label={execution.failedStepCount}
                              color="error"
                              variant="outlined"
                              sx={{ minWidth: 32, height: 20, '& .MuiChip-label': { px: 0.5 } }}
                            />
                          </Tooltip>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          / {execution.stepCount}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="View details">
                          <IconButton 
                            size="small"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              viewInstance(execution.id);
                            }}
                          >
                            <Icon sx={{ fontSize: 18 }}>visibility</Icon>
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              openDeleteDialog('single', execution.id);
                            }}
                          >
                            <Icon sx={{ fontSize: 18 }}>delete</Icon>
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: `1px solid ${theme.palette.divider}`,
        }}>
          <Box sx={{ pl: 2 }}>
            <Tooltip title="Clear all execution history for this workflow">
              <Button
                size="small"
                color="error"
                startIcon={<Icon>delete_sweep</Icon>}
                onClick={() => openDeleteDialog('clear')}
                disabled={historyPagination.total === 0}
              >
                Clear All History
              </Button>
            </Tooltip>
          </Box>
          <TablePagination
            component="div"
            count={historyPagination.total}
            page={historyPagination.page}
            onPageChange={handlePageChange}
            rowsPerPage={historyPagination.limit}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Box>
      </>
    );
  };

  // Get delete dialog content based on type
  const getDeleteDialogContent = () => {
    switch (deleteDialogType) {
      case 'single':
        return {
          title: 'Delete Execution History',
          content: 'Are you sure you want to delete this workflow execution history? This action cannot be undone.',
        };
      case 'batch':
        return {
          title: 'Delete Selected Items',
          content: `Are you sure you want to delete ${numSelected} selected workflow execution${numSelected > 1 ? 's' : ''}? This action cannot be undone.`,
        };
      case 'clear':
        return {
          title: 'Clear All Execution History',
          content: `Are you sure you want to clear ALL execution history (${historyPagination.total} records) for this workflow? This action cannot be undone.`,
        };
      default:
        return { title: 'Confirm Delete', content: 'Are you sure?' };
    }
  };

  const dialogContent = getDeleteDialogContent();

  return (
    <Box sx={{ width: '100%' }}>
      <Paper 
        variant="outlined"
        sx={{ 
          bgcolor: 'background.paper',
          borderColor: theme.palette.divider,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{ 
              '& .MuiTab-root': {
                textTransform: 'none',
              }
            }}
          >
            <Tab 
              label={
                <Badge 
                  badgeContent={runningCount} 
                  color="primary"
                  invisible={runningCount === 0}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: runningCount > 0 ? 2 : 0 }}>
                    <Icon sx={{ fontSize: 18 }}>play_circle</Icon>
                    <span>Active Instances</span>
                  </Box>
                </Badge>
              }
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon sx={{ fontSize: 18 }}>history</Icon>
                  <span>Execution History</span>
                  {historyPagination.total > 0 && (
                    <Chip 
                      label={historyPagination.total} 
                      size="small" 
                      sx={{ height: 18, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                    />
                  )}
                </Box>
              }
            />
          </Tabs>
          <Box sx={{ pr: 2 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={() => setLocalRefreshKey((prev: number) => prev + 1)} size="small">
                <Icon>refresh</Icon>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {activeTab === 0 && renderActiveInstances()}
        {activeTab === 1 && renderHistory()}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {dialogContent.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {dialogContent.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Icon>delete</Icon>}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
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
