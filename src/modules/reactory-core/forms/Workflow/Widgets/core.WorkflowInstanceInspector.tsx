import { WorkflowInstanceInspectorProps } from './types';

/**
 * Status mapping from workflow-es numeric status to labels
 */
const WORKFLOW_STATUS: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: 'PENDING', color: 'default', icon: 'schedule' },
  1: { label: 'RUNNING', color: 'primary', icon: 'play_circle' },
  2: { label: 'COMPLETE', color: 'success', icon: 'check_circle' },
  3: { label: 'TERMINATED', color: 'error', icon: 'error' },
  4: { label: 'SUSPENDED', color: 'warning', icon: 'pause_circle' },
};

const STEP_STATUS: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: 'LEGACY', color: 'default', icon: 'history' },
  1: { label: 'PENDING', color: 'default', icon: 'schedule' },
  2: { label: 'RUNNING', color: 'primary', icon: 'play_circle' },
  3: { label: 'COMPLETE', color: 'success', icon: 'check_circle' },
  4: { label: 'SLEEPING', color: 'info', icon: 'bedtime' },
  5: { label: 'WAITING', color: 'info', icon: 'hourglass_top' },
  6: { label: 'FAILED', color: 'error', icon: 'cancel' },
  7: { label: 'COMPENSATED', color: 'warning', icon: 'undo' },
  8: { label: 'CANCELLED', color: 'warning', icon: 'block' },
};

const QUERY = `
  query WorkflowInstanceInspector($instanceId: String!) {
    workflowExecutionHistoryById(instanceId: $instanceId) {
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
        persistenceData
        eventData
        eventName
        outcome
        errorMessage
        errorStack
        errorTime
        errors {
          message
          stack
          errorTime
          retryCount
        }
      }
    }
  }
`;

/**
 * WorkflowInstanceInspector Component
 *
 * Displays a detailed view of a single workflow instance
 * including its metadata, execution timeline, and step-level details.
 */
const WorkflowInstanceInspector = (props: WorkflowInstanceInspectorProps) => {
  const { reactory, instanceId, onClose } = props;

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
    Chip,
    Divider,
    Alert,
    AlertTitle,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Paper,
    Tooltip,
    IconButton,
    Collapse,
    Table,
    TableBody,
    TableCell,
    TableRow,
    TableContainer,
  } = MaterialCore;

  const theme = reactory.muiTheme;

  const [loading, setLoading] = React.useState(true);
  const [instance, setInstance] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState(null);
  const [expandedStep, setExpandedStep] = React.useState(null);
  const [showInputData, setShowInputData] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const fetchInstance = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const result = await reactory.graphqlQuery(QUERY, { instanceId });

        if (cancelled) return;

        const data: any = result?.data;
        if (data?.workflowExecutionHistoryById) {
          setInstance(data.workflowExecutionHistoryById);
        } else {
          setErrorMsg('Workflow instance not found');
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Failed to load workflow instance');
          reactory.log(`Error fetching workflow instance: ${err?.message}`, { err }, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (instanceId) {
      fetchInstance();
    }
    return () => { cancelled = true; };
  }, [instanceId]);

  // ---- Helpers ----

  const formatDate = (d: string | null | undefined) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString();
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getWorkflowStatus = (status: number) =>
    WORKFLOW_STATUS[status] || WORKFLOW_STATUS[0];

  const getStepStatus = (status: number) =>
    STEP_STATUS[status] || STEP_STATUS[1];

  const toggleStep = (stepId: string) => {
    setExpandedStep((prev: string | null) => (prev === stepId ? null : stepId));
  };

  const renderJsonBlock = (label: string, data: any) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return null;
    }
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 1.5,
            mt: 0.5,
            borderRadius: 1,
            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: 200,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            m: 0,
          }}
        >
          {JSON.stringify(data, null, 2)}
        </Box>
      </Box>
    );
  };

  // ---- Loading State ----
  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading workflow instance...
        </Typography>
      </Box>
    );
  }

  // ---- Error State ----
  if (errorMsg) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {errorMsg}
        </Alert>
      </Box>
    );
  }

  // ---- No Data ----
  if (!instance) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Icon sx={{ fontSize: 48, color: 'text.disabled' }}>search_off</Icon>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          No workflow instance data available
        </Typography>
      </Box>
    );
  }

  const inst: any = instance;
  const wfStatus = getWorkflowStatus(inst.status);
  const pointers: any[] = inst.executionPointers || [];
  const sortedPointers = [...pointers].sort((a, b) => a.stepId - b.stepId);

  const handleDownloadData = () => {
    const json = JSON.stringify(inst, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${inst.id || 'instance'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3, overflowY: 'auto', maxHeight: '100%' }}>
      {/* ========== Header ========== */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Icon sx={{ fontSize: 28 }} color={wfStatus.color as any}>{wfStatus.icon}</Icon>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {inst.workflowDefinitionId}
            </Typography>
            <Chip
              label={inst.statusLabel || wfStatus.label}
              color={wfStatus.color as any}
              size="small"
              variant="outlined"
            />
          </Box>
          {inst.description && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 5.5 }}>
              {inst.description}
            </Typography>
          )}
        </Box>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <Icon>close</Icon>
          </IconButton>
        )}
      </Box>

      {/* ========== Instance Metadata ========== */}
      <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: 180, color: 'text.secondary' }}>
                  Instance ID
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {inst.id}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Version</TableCell>
                <TableCell>{inst.version}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Created</TableCell>
                <TableCell>{formatDate(inst.createTime)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Completed</TableCell>
                <TableCell>{formatDate(inst.completeTime)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Duration</TableCell>
                <TableCell>{formatDuration(inst.duration)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Steps</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={`${inst.completedStepCount} completed`} size="small" color="success" variant="outlined" />
                    {inst.failedStepCount > 0 && (
                      <Chip label={`${inst.failedStepCount} failed`} size="small" color="error" variant="outlined" />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      / {inst.stepCount} total
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ========== Input / Workflow Data ========== */}
      {inst.data && Object.keys(inst.data).length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flex: 1 }}
              onClick={() => setShowInputData((prev: boolean) => !prev)}
            >
              <Icon sx={{ fontSize: 18, transition: 'transform 0.2s', transform: showInputData ? 'rotate(90deg)' : 'none' }}>
                chevron_right
              </Icon>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Workflow Data
              </Typography>
            </Box>
            <Tooltip title="Download as JSON">
              <IconButton size="small" onClick={handleDownloadData}>
                <Icon sx={{ fontSize: 18 }}>download</Icon>
              </IconButton>
            </Tooltip>
          </Box>
          <Collapse in={showInputData}>
            <Box
              component="pre"
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                overflow: 'auto',
                maxHeight: 600,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                m: 0,
              }}
            >
              {JSON.stringify(inst.data, null, 2)}
            </Box>
          </Collapse>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* ========== Execution Steps ========== */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        Execution Steps
      </Typography>

      {sortedPointers.length === 0 ? (
        <Alert severity="info">No execution steps recorded for this instance.</Alert>
      ) : (
        <Stepper orientation="vertical" activeStep={-1} sx={{ ml: 0 }}>
          {sortedPointers.map((pointer: any) => {
            const stepStatus = getStepStatus(pointer.status);
            const isExpanded = expandedStep === pointer.id;
            const hasPersistenceData = pointer.persistenceData && Object.keys(pointer.persistenceData).length > 0;
            const hasEventData = pointer.eventData && Object.keys(pointer.eventData).length > 0;
            const hasOutcome = pointer.outcome && (typeof pointer.outcome !== 'object' || Object.keys(pointer.outcome).length > 0);
            const isFailed = pointer.status === 6;
            const stepErrors: any[] = pointer.errors || [];

            return (
              <Step key={pointer.id} active expanded>
                <StepLabel
                  icon={
                    <Tooltip title={stepStatus.label}>
                      <Icon color={stepStatus.color as any} sx={{ fontSize: 24 }}>
                        {stepStatus.icon}
                      </Icon>
                    </Tooltip>
                  }
                  onClick={() => toggleStep(pointer.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Step {pointer.stepId}
                    </Typography>
                    <Chip
                      label={pointer.statusLabel || stepStatus.label}
                      size="small"
                      variant="outlined"
                      color={stepStatus.color as any}
                    />
                    {pointer.retryCount > 0 && (
                      <Chip
                        label={`${pointer.retryCount} ${pointer.retryCount === 1 ? 'retry' : 'retries'}`}
                        size="small"
                        variant="outlined"
                        color="warning"
                      />
                    )}
                    {pointer.active && (
                      <Chip label="Active" size="small" color="primary" />
                    )}
                    {pointer.eventName && (
                      <Chip
                        icon={<Icon sx={{ fontSize: '14px !important' }}>bolt</Icon>}
                        label={pointer.eventName}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    <Icon
                      sx={{
                        fontSize: 18,
                        ml: 'auto',
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        color: 'text.secondary',
                      }}
                    >
                      expand_more
                    </Icon>
                  </Box>
                </StepLabel>
                <StepContent>
                  {/* Summary line (always visible) */}
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(pointer.startTime)}
                    {pointer.endTime ? ` → ${formatDate(pointer.endTime)}` : ''}
                    {pointer.duration !== null && pointer.duration !== undefined
                      ? ` (${formatDuration(pointer.duration)})`
                      : ''}
                  </Typography>

                  {/* Error message (always visible when step has failed) */}
                  {isFailed && pointer.errorMessage && (
                    <Alert severity="error" variant="outlined" sx={{ mt: 1, '& .MuiAlert-message': { width: '100%' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: pointer.errorStack ? 0.5 : 0 }}>
                        {pointer.errorMessage}
                      </Typography>
                      {pointer.errorStack && (
                        <Box
                          component="pre"
                          sx={{
                            mt: 0.5,
                            p: 1,
                            borderRadius: 1,
                            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                            border: '1px solid',
                            borderColor: 'divider',
                            fontSize: '0.7rem',
                            fontFamily: 'monospace',
                            overflow: 'auto',
                            maxHeight: 150,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            m: 0,
                          }}
                        >
                          {pointer.errorStack}
                        </Box>
                      )}
                      {pointer.errorTime && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Error at: {formatDate(pointer.errorTime)}
                        </Typography>
                      )}
                    </Alert>
                  )}

                  {/* Expanded details */}
                  <Collapse in={isExpanded}>
                    <Box sx={{ mt: 1.5 }}>
                      <Paper variant="outlined" sx={{ p: 2, overflow: 'hidden' }}>
                        <TableContainer>
                          <Table size="small">
                            <TableBody>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600, width: 140, color: 'text.secondary', borderBottom: 'none' }}>
                                  Pointer ID
                                </TableCell>
                                <TableCell sx={{ borderBottom: 'none' }}>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                    {pointer.id}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>
                                  Start Time
                                </TableCell>
                                <TableCell sx={{ borderBottom: 'none' }}>
                                  {formatDate(pointer.startTime)}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>
                                  End Time
                                </TableCell>
                                <TableCell sx={{ borderBottom: 'none' }}>
                                  {formatDate(pointer.endTime)}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>
                                  Duration
                                </TableCell>
                                <TableCell sx={{ borderBottom: 'none' }}>
                                  {formatDuration(pointer.duration)}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>
                                  Retry Count
                                </TableCell>
                                <TableCell sx={{ borderBottom: 'none' }}>
                                  {pointer.retryCount}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>

                        {hasPersistenceData && renderJsonBlock('Persistence Data', pointer.persistenceData)}
                        {hasOutcome && renderJsonBlock('Outcome', pointer.outcome)}
                        {hasEventData && renderJsonBlock('Event Data', pointer.eventData)}

                        {/* Error history across retries */}
                        {stepErrors.length > 0 && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Error History ({stepErrors.length} error{stepErrors.length !== 1 ? 's' : ''})
                            </Typography>
                            {stepErrors.map((err: any, eIdx: number) => (
                              <Box
                                key={`err-${eIdx}`}
                                sx={{
                                  mt: 1,
                                  p: 1.5,
                                  borderRadius: 1,
                                  border: '1px solid',
                                  borderColor: eIdx === stepErrors.length - 1 ? 'error.main' : 'divider',
                                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Chip
                                    label={`Attempt #${err.retryCount}`}
                                    size="small"
                                    variant="outlined"
                                    color={eIdx === stepErrors.length - 1 ? 'error' : 'default'}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(err.errorTime)}
                                  </Typography>
                                  {eIdx === stepErrors.length - 1 && (
                                    <Chip label="Latest" size="small" color="error" />
                                  )}
                                </Box>
                                <Typography variant="body2" color="error.main" sx={{ fontWeight: 500, mb: err.stack ? 0.5 : 0 }}>
                                  {err.message}
                                </Typography>
                                {err.stack && (
                                  <Box
                                    component="pre"
                                    sx={{
                                      mt: 0.5,
                                      p: 1,
                                      borderRadius: 1,
                                      bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      fontSize: '0.7rem',
                                      fontFamily: 'monospace',
                                      overflow: 'auto',
                                      maxHeight: 100,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      m: 0,
                                    }}
                                  >
                                    {err.stack}
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  </Collapse>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
      )}
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowInstanceInspector',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowInstanceInspector,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR'],
};

//@ts-ignore
if (globalThis?.reactory?.api) {
  //@ts-ignore
  globalThis.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowInstanceInspector,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  globalThis.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: WorkflowInstanceInspector,
  });
}
