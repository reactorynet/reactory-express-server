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

const LOG_URL_QUERY = `
  query WorkflowInstanceLogFileUrl($instanceId: String!) {
    workflowInstanceLogFileUrl(instanceId: $instanceId)
  }
`;

/**
 * WorkflowInstanceInspector Component
 *
 * Displays a detailed view of a single workflow instance across four compact tabs:
 *   1. Overview  — metadata table and status
 *   2. Steps     — execution step timeline
 *   3. Data      — raw workflow data JSON
 *   4. Logs      — per-instance log file (fetched lazily on tab activation)
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
    Tabs,
    Tab,
  } = MaterialCore;

  const theme = reactory.muiTheme;

  // ---- Main instance state ----
  const [loading, setLoading] = React.useState(true);
  const [instance, setInstance] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState(null);

  // ---- Tab state ----
  const [activeTab, setActiveTab] = React.useState(0);

  // ---- Steps tab state ----
  const [expandedStep, setExpandedStep] = React.useState(null);

  // ---- Data tab state ----
  const [showInputData, setShowInputData] = React.useState(false);

  // ---- Logs tab state ----
  const [logContent, setLogContent] = React.useState<string | null>(null);
  const [logLoading, setLogLoading] = React.useState(false);
  const [logError, setLogError] = React.useState<string | null>(null);
  const [logFetched, setLogFetched] = React.useState(false);

  // ---- Fetch main instance ----
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

  // ---- Fetch log when Logs tab is first activated ----
  React.useEffect(() => {
    if (activeTab !== 3 || logFetched) return;
    let cancelled = false;

    const fetchLog = async () => {
      setLogLoading(true);
      setLogError(null);
      try {
        // Step 1: resolve the CDN URL from GraphQL
        const result = await reactory.graphqlQuery(LOG_URL_QUERY, { instanceId });
        const url: string | null = result?.data?.workflowInstanceLogFileUrl ?? null;

        if (!url) {
          if (!cancelled) setLogContent(null);
          return;
        }

        // Step 2: fetch the raw log text from the CDN endpoint
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const text = await response.text();
        if (!cancelled) setLogContent(text);
      } catch (err: any) {
        if (!cancelled) {
          setLogError(err?.message || 'Failed to load log file');
          reactory.log(`Error fetching workflow log: ${err?.message}`, { err }, 'error');
        }
      } finally {
        if (!cancelled) {
          setLogLoading(false);
          setLogFetched(true);
        }
      }
    };

    fetchLog();
    return () => { cancelled = true; };
  }, [activeTab, logFetched, instanceId]);

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

  const handleRefreshLog = () => {
    setLogFetched(false);
    setLogContent(null);
    setLogError(null);
  };

  // ---- Tab panel helper ----
  const TabPanel = ({ index, children }: { index: number; children: any }) => (
    <Box role="tabpanel" hidden={activeTab !== index} sx={{ flex: 1, overflow: 'auto' }}>
      {activeTab === index && children}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ========== Header ========== */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Icon sx={{ fontSize: 24 }} color={wfStatus.color as any}>{wfStatus.icon}</Icon>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
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
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5 }}>
              {inst.description}
            </Typography>
          )}
        </Box>
        {onClose && (
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
            <Icon>close</Icon>
          </IconButton>
        )}
      </Box>

      {/* ========== Compact Tabs ========== */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, px: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_: any, v: number) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 2, fontSize: '0.8rem', textTransform: 'none' },
          }}
        >
          <Tab label="Overview" />
          <Tab label={`Steps (${sortedPointers.length})`} />
          <Tab label="Data" />
          <Tab label="Logs" />
        </Tabs>
      </Box>

      {/* ========== Tab Panels ========== */}

      {/* --- Overview --- */}
      <TabPanel index={0}>
        <Box sx={{ p: 3 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
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
        </Box>
      </TabPanel>

      {/* --- Steps --- */}
      <TabPanel index={1}>
        <Box sx={{ p: 3 }}>
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
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(pointer.startTime)}
                        {pointer.endTime ? ` → ${formatDate(pointer.endTime)}` : ''}
                        {pointer.duration !== null && pointer.duration !== undefined
                          ? ` (${formatDuration(pointer.duration)})`
                          : ''}
                      </Typography>

                      {isFailed && pointer.errorMessage && (
                        <Alert severity="error" variant="outlined" sx={{ mt: 1, '& .MuiAlert-message': { width: '100%' } }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: pointer.errorStack ? 0.5 : 0 }}>
                            {pointer.errorMessage}
                          </Typography>
                          {pointer.errorStack && (
                            <Box
                              component="pre"
                              sx={{
                                mt: 0.5, p: 1, borderRadius: 1,
                                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                                border: '1px solid', borderColor: 'divider',
                                fontSize: '0.7rem', fontFamily: 'monospace',
                                overflow: 'auto', maxHeight: 150,
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
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
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Start Time</TableCell>
                                    <TableCell sx={{ borderBottom: 'none' }}>{formatDate(pointer.startTime)}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>End Time</TableCell>
                                    <TableCell sx={{ borderBottom: 'none' }}>{formatDate(pointer.endTime)}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Duration</TableCell>
                                    <TableCell sx={{ borderBottom: 'none' }}>{formatDuration(pointer.duration)}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 'none' }}>Retry Count</TableCell>
                                    <TableCell sx={{ borderBottom: 'none' }}>{pointer.retryCount}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>

                            {hasPersistenceData && renderJsonBlock('Persistence Data', pointer.persistenceData)}
                            {hasOutcome && renderJsonBlock('Outcome', pointer.outcome)}
                            {hasEventData && renderJsonBlock('Event Data', pointer.eventData)}

                            {stepErrors.length > 0 && (
                              <Box sx={{ mt: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Error History ({stepErrors.length} error{stepErrors.length !== 1 ? 's' : ''})
                                </Typography>
                                {stepErrors.map((err: any, eIdx: number) => (
                                  <Box
                                    key={`err-${eIdx}`}
                                    sx={{
                                      mt: 1, p: 1.5, borderRadius: 1,
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
                                          mt: 0.5, p: 1, borderRadius: 1,
                                          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                                          border: '1px solid', borderColor: 'divider',
                                          fontSize: '0.7rem', fontFamily: 'monospace',
                                          overflow: 'auto', maxHeight: 100,
                                          whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
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
      </TabPanel>

      {/* --- Data --- */}
      <TabPanel index={2}>
        <Box sx={{ p: 3 }}>
          {(!inst.data || Object.keys(inst.data).length === 0) ? (
            <Alert severity="info">No workflow data available.</Alert>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                  Workflow Data
                </Typography>
                <Tooltip title="Download as JSON">
                  <IconButton size="small" onClick={handleDownloadData}>
                    <Icon sx={{ fontSize: 18 }}>download</Icon>
                  </IconButton>
                </Tooltip>
              </Box>
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
            </>
          )}
        </Box>
      </TabPanel>

      {/* --- Logs --- */}
      <TabPanel index={3}>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
              Instance Log
            </Typography>
            <Tooltip title="Refresh log">
              <span>
                <IconButton size="small" onClick={handleRefreshLog} disabled={logLoading}>
                  <Icon sx={{ fontSize: 18 }}>refresh</Icon>
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {logLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Loading log...</Typography>
            </Box>
          )}

          {!logLoading && logError && (
            <Alert severity="error">{logError}</Alert>
          )}

          {!logLoading && !logError && logContent === null && logFetched && (
            <Alert severity="info">No log file found for this instance.</Alert>
          )}

          {!logLoading && !logError && logContent !== null && (
            <Box
              component="pre"
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? 'grey.950' : 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.75rem',
                fontFamily: '"Fira Code", "Cascadia Code", monospace',
                overflow: 'auto',
                flex: 1,
                maxHeight: '60vh',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                m: 0,
                lineHeight: 1.6,
              }}
            >
              {logContent}
            </Box>
          )}
        </Box>
      </TabPanel>
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
