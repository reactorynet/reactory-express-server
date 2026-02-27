import { WorkflowErrorsProps } from './types';

/**
 * WorkflowErrors Component
 * 
 * Displays error statistics and recent errors for the workflow.
 * Queries both the workflow's errors field and execution history
 * to surface step-level failures and ErrorHandler stats.
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
    ListItemIcon,
    Divider,
    Chip,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
  } = MaterialCore;

  const [loading, setLoading] = React.useState(true);
  const [errors, setErrors] = React.useState([]);
  const [executionErrors, setExecutionErrors] = React.useState([]);
  const [errorMessage, setErrorMessage] = React.useState(null);

  const workflowId = workflow.id || `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;

  React.useEffect(() => {
    let cancelled = false;

    const fetchErrors = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        // Fetch the workflow's errors field and execution history with failed steps
        const result = await reactory.graphqlQuery(`
          query WorkflowErrorDetails($id: String!, $workflowDefinitionId: String!, $pagination: WorkflowHistoryPaginationInput) {
            workflowWithId(id: $id) {
              errors {
                message
                code
                stack
              }
              statistics {
                totalExecutions
                successfulExecutions
                failedExecutions
                averageExecutionTime
              }
            }
            workflowExecutionHistoryByDefinitionId(
              workflowDefinitionId: $workflowDefinitionId,
              pagination: $pagination
            ) {
              instances {
                id
                workflowDefinitionId
                status
                statusLabel
                createTime
                completeTime
                failedStepCount
                stepCount
                completedStepCount
                executionPointers {
                  id
                  stepId
                  status
                  statusLabel
                  startTime
                  endTime
                  retryCount
                }
              }
              pagination {
                total
              }
            }
          }
        `, {
          id: workflowId,
          workflowDefinitionId: workflowId,
          pagination: { page: 1, limit: 20, sortOrder: 'DESC' },
        });

        if (cancelled) return;

        const resultData: any = result?.data || {};

        // Extract errors from the workflow's errors resolver
        const workflowErrors = resultData.workflowWithId?.errors || [];
        setErrors(workflowErrors);

        // Extract execution history instances that have failed steps
        const allInstances = resultData.workflowExecutionHistoryByDefinitionId?.instances || [];
        const failedInstances = allInstances.filter(
          (inst: any) => inst.failedStepCount > 0 || inst.status === 3 /* TERMINATED */
        );
        setExecutionErrors(failedInstances);

        // Update statistics if available from fresh query
        const stats = resultData.workflowWithId?.statistics;
        if (stats) {
          workflow.statistics = stats;
        }
      } catch (error: any) {
        if (!cancelled) {
          setErrorMessage(error?.message || 'Failed to fetch error data');
          reactory.log(`Error fetching workflow errors: ${error?.message}`, { error }, 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchErrors();
    return () => { cancelled = true; };
  }, [workflowId]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Loading error data...
        </Typography>
      </Box>
    );
  }

  if (errorMessage) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Failed to Load Errors</AlertTitle>
          {errorMessage}
        </Alert>
      </Box>
    );
  }

  const failedExecutions = workflow.statistics?.failedExecutions || 0;
  const hasErrors = errors.length > 0 || executionErrors.length > 0 || failedExecutions > 0;

  if (!hasErrors) {
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Error Summary */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>Error Summary</AlertTitle>
        This workflow has <strong>{failedExecutions}</strong> failed execution(s)
        {executionErrors.length > 0 && (
          <> with <strong>{executionErrors.length}</strong> instance(s) containing failed steps</>
        )}.
      </Alert>

      {/* Statistics */}
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
        Error Statistics
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 1 }}>
          <Typography variant="body2">Total Failed Executions</Typography>
          <Chip label={failedExecutions} color="error" />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 1 }}>
          <Typography variant="body2">Success Rate</Typography>
          <Chip 
            label={`${Math.round(((workflow.statistics?.successfulExecutions || 0) / (workflow.statistics?.totalExecutions || 1)) * 100)}%`}
            color={(workflow.statistics?.successfulExecutions || 0) / (workflow.statistics?.totalExecutions || 1) > 0.8 ? 'success' : 'warning'}
          />
        </Box>
      </Box>

      {/* Workflow-Level Errors (from ErrorHandler + execution history step failures) */}
      {errors.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Error Details
          </Typography>
          <List sx={{ mb: 3 }}>
            {errors.map((error: any, index: number) => (
              <React.Fragment key={error.code || `error-${index}`}>
                {index > 0 && <Divider />}
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    <Icon color="error">error_outline</Icon>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {error.message || 'Unknown error'}
                        </Typography>
                        {error.code && (
                          <Chip label={error.code} size="small" variant="outlined" color="error" />
                        )}
                      </Box>
                    }
                    secondary={error.stack ? (
                      <Typography
                        variant="caption"
                        component="pre"
                        sx={{
                          mt: 1,
                          p: 1,                          
                          borderRadius: 1,
                          overflow: 'auto',
                          maxHeight: 120,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                      >
                        {error.stack}
                      </Typography>
                    ) : null}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </>
      )}

      {/* Execution History with Failed Steps */}
      {executionErrors.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Recent Failed Executions
          </Typography>
          {executionErrors.map((instance: any, index: number) => (
            <Accordion key={instance.id || index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Icon color="error" sx={{ fontSize: 20 }}>error</Icon>
                  <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                    {formatDate(instance.createTime)}
                  </Typography>
                  <Chip 
                    label={instance.statusLabel || 'Unknown'} 
                    size="small"
                    color={instance.status === 3 ? 'error' : 'warning'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {instance.failedStepCount} failed / {instance.stepCount} steps
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense disablePadding>
                  {(instance.executionPointers || []).map((pointer: any, pIdx: number) => {
                    const isFailed = pointer.status === 6; /* FAILED */
                    const isComplete = pointer.status === 3; /* COMPLETE */
                    const getIconColor = () => {
                      if (isFailed) return 'error';
                      if (isComplete) return 'success';
                      return 'disabled';
                    };
                    const getIconName = () => {
                      if (isFailed) return 'cancel';
                      if (isComplete) return 'check_circle';
                      return 'pending';
                    };
                    const getChipColor = () => {
                      if (isFailed) return 'error';
                      if (isComplete) return 'success';
                      return 'default';
                    };
                    const getSecondaryText = () => {
                      if (!pointer.startTime) return 'Not started';
                      const startText = `Started: ${formatDate(pointer.startTime)}`;
                      if (pointer.endTime) return `${startText} | Ended: ${formatDate(pointer.endTime)}`;
                      return startText;
                    };
                    return (
                      <ListItem key={pointer.id || `pointer-${pIdx}`} sx={{ pl: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Icon 
                            sx={{ fontSize: 18 }} 
                            color={getIconColor()}
                          >
                            {getIconName()}
                          </Icon>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                Step {pointer.stepId}
                              </Typography>
                              <Chip 
                                label={pointer.statusLabel} 
                                size="small" 
                                variant="outlined"
                                color={getChipColor()}
                              />
                              {pointer.retryCount > 0 && (
                                <Chip 
                                  label={`${pointer.retryCount} retries`} 
                                  size="small" 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={getSecondaryText()}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
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
