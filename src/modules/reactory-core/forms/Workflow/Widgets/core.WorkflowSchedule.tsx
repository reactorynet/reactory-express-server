import { name } from 'ejs';
import { WorkflowScheduleProps } from './types';

interface WorkflowScheduleQueryResult {  
    workflowWithId: {
      id: string;
      name: string;
      nameSpace: string;
      version: string;
      schedules: ScheduleData[];
    }  
}

interface ScheduleData {
  id: string;
  name: string;
  description?: string;
  schedule: {
    cron: string;
    timezone?: string;
    enabled?: boolean;
  };
  workflow: {
    id: string;
    version?: string;
    nameSpace?: string;
  };
  properties?: any;
  propertiesFormId?: string;
  retry?: {
    attempts: number;
    delay: number;
  };
  timeout?: number;
  maxConcurrent?: number;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  errorCount: number;
  isRunning: boolean;
  enabled: boolean;
}

type WorkflowScheduleQueryData = WorkflowScheduleQueryResult | null;

interface WorkflowScheduleQueryVariables {
    id: string;
}

/**
 * Schema form definition for creating/editing a workflow schedule.
 * This schema is used with ReactoryForm to render the schedule editor.
 */
const getScheduleFormSchema = (workflow: any) => ({
  type: 'object',
  title: 'Schedule Configuration',
  required: ['name', 'cron'],
  properties: {
    id: {
      type: 'string',
      title: 'Schedule ID',
      description: 'A unique identifier for this schedule. Auto-generated if not provided.',
    },
    name: {
      type: 'string',
      title: 'Schedule Name',
      description: 'A human-readable name for this schedule.',
    },
    description: {
      type: 'string',
      title: 'Description',
      description: 'Optional description of what this schedule does.',
    },
    cron: {
      type: 'string',
      title: 'Cron Expression',
      description: 'Cron schedule expression (e.g., "0 */6 * * *" for every 6 hours).',
    },
    timezone: {
      type: 'string',
      title: 'Timezone',
      description: 'Timezone for the schedule (e.g., "UTC", "America/New_York").',
    },
    enabled: {
      type: 'boolean',
      title: 'Enabled',
      description: 'Whether this schedule is active.',
      default: true,      
    },
    timeout: {
      type: 'integer',
      title: 'Timeout (seconds)',
      description: 'Maximum execution time in seconds. Leave empty for no timeout.',
    },
    maxConcurrent: {
      type: 'integer',
      title: 'Max Concurrent',
      description: 'Maximum concurrent executions. Leave empty for unlimited.',
    },
    retryAttempts: {
      type: 'integer',
      title: 'Retry Attempts',
      description: 'Number of retry attempts on failure.',
      minimum: 0,
    },
    retryDelay: {
      type: 'integer',
      title: 'Retry Delay (seconds)',
      description: 'Delay between retries in seconds.',
      minimum: 0,
    },
  },
});

const getScheduleFormUiSchema = () => ({
  'ui:options': { showSubmitButton: false },
  id: { 'ui:options': { showLabel: true } },
  name: { 'ui:autofocus': true },
  description: { 'ui:widget': 'textarea', 'ui:options': { rows: 2 } },
  cron: { 'ui:placeholder': '0 */6 * * *' },
  timezone: { 'ui:placeholder': 'UTC' },
  enabled: { 'ui:widget': 'checkbox' },
  timeout: { 'ui:emptyValue': undefined },
  maxConcurrent: { 'ui:emptyValue': undefined },
  retryAttempts: { 'ui:emptyValue': undefined },
  retryDelay: { 'ui:emptyValue': undefined },
});

/**
 * Predefined cron expression presets for quick selection
 */
const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Weekly (Sun midnight)', value: '0 0 * * 0' },
  { label: 'Monthly (1st midnight)', value: '0 0 1 * *' },
];

const CREATE_SCHEDULE_MUTATION = `
  mutation CreateWorkflowSchedule($config: ScheduleConfigInput!) {
    createWorkflowSchedule(config: $config) {
      id
      name
      description
      schedule {
        cron
        timezone
        enabled
      }
      workflow {
        id
        version
        nameSpace
      }
      properties
      propertiesFormId
      lastRun
      nextRun
      runCount
      errorCount
      isRunning
      enabled
    }
  }
`;

const UPDATE_SCHEDULE_MUTATION = `
  mutation UpdateWorkflowSchedule($scheduleId: String!, $updates: UpdateScheduleInput!) {
    updateWorkflowSchedule(scheduleId: $scheduleId, updates: $updates) {
      id
      name
      description
      schedule {
        cron
        timezone
        enabled
      }
      workflow {
        id
        version
        nameSpace
      }
      properties
      propertiesFormId
      lastRun
      nextRun
      runCount
      errorCount
      isRunning
      enabled
    }
  }
`;

const DELETE_SCHEDULE_MUTATION = `
  mutation DeleteWorkflowSchedule($scheduleId: String!) {
    deleteWorkflowSchedule(scheduleId: $scheduleId) {
      success
      message
    }
  }
`;

/**
 * Converts a ScheduleData object to the flat form data shape used by the editor
 */
const scheduleToFormData = (schedule: ScheduleData) => ({
  id: schedule.id,
  name: schedule.name,
  description: schedule.description || '',
  cron: schedule.schedule?.cron || '',
  timezone: schedule.schedule?.timezone || '',
  enabled: schedule.schedule?.enabled !== false,
  timeout: schedule.timeout || undefined,
  maxConcurrent: schedule.maxConcurrent || undefined,
  retryAttempts: schedule.retry?.attempts || undefined,
  retryDelay: schedule.retry?.delay || undefined,
  propertiesFormId: schedule.propertiesFormId || '',
});

/**
 * Converts flat form data to the GraphQL ScheduleConfigInput shape (for create)
 */
const formDataToCreateInput = (formData: any, workflow: any, properties?: any) => ({
  id: formData.id || undefined,
  name: formData.name,
  description: formData.description || undefined,
  workflow: {
    id: workflow.id,
    name: workflow.name,
    version: workflow.version || '1.0.0',
    nameSpace: workflow.nameSpace,
  },
  schedule: {
    cron: formData.cron,
    timezone: formData.timezone || undefined,
    enabled: formData.enabled !== false,
  },
  properties: properties || undefined,
  propertiesFormId: formData.propertiesFormId || undefined,
  retry: (formData.retryAttempts || formData.retryDelay) ? {
    attempts: formData.retryAttempts || 0,
    delay: formData.retryDelay || 0,
  } : undefined,
  timeout: formData.timeout || undefined,
  maxConcurrent: formData.maxConcurrent || undefined,
});

/**
 * Converts flat form data to the GraphQL UpdateScheduleInput shape (for update)
 */
const formDataToUpdateInput = (formData: any, workflow: any, properties?: any) => { 
  console.log('Form data to update input', formData, properties); 
  debugger;
  return {
    name: formData.name,
    description: formData.description || undefined,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      version: workflow.version || '1.0.0',
      nameSpace: workflow.nameSpace,
    },
    schedule: {
      cron: formData.cron,
      timezone: formData.timezone || undefined,
      enabled: formData.enabled !== false,
    },
    properties: properties || undefined,
    propertiesFormId: formData.propertiesFormId || undefined,
    retry: (formData.retryAttempts || formData.retryDelay) ? {
      attempts: formData.retryAttempts || 0,
      delay: formData.retryDelay || 0,
    } : undefined,
    timeout: formData.timeout || undefined,
    maxConcurrent: formData.maxConcurrent || undefined,
  }
};

/**
 * WorkflowSchedule Component
 * 
 * Displays schedule information for the workflow with CRUD capabilities.
 * The "Add Schedule" button opens a modal with a ReactoryForm schema form
 * to create or update a schedule. The schedule is persisted as a YAML config
 * file that the Scheduler loads from disk.
 */
const WorkflowSchedule = (props: WorkflowScheduleProps) => {
  const { reactory, workflow } = props;

  const { React, Material } = reactory.getComponents<any>([
    'react.React',
    'material-ui.Material',
  ]);

  // Conditionally load ReactoryForm for properties editing
  const ReactoryForm = reactory.getComponent('core.ReactoryForm@1.0.0');

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Icon, 
    Button,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    Chip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Snackbar,
    Alert,
    Tabs,
    Tab,
  } = MaterialCore;

  const theme = reactory.muiTheme;

  const [schedules, setSchedules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState(null);
  const [formData, setFormData] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [menuScheduleId, setMenuScheduleId] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState(0);
  const [propertiesData, setPropertiesData] = React.useState(null as any);
  const [propertiesJsonText, setPropertiesJsonText] = React.useState('');
  const [propertiesJsonError, setPropertiesJsonError] = React.useState('');

  const fetchSchedules = React.useCallback(async () => {
    setLoading(true);
    try {
      const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;
      const result = await reactory.graphqlQuery<WorkflowScheduleQueryData, WorkflowScheduleQueryVariables>(`
        query GetWorkflowSchedules($id: String!) {
          workflowWithId(id: $id) {
            id
            name
            nameSpace
            version
            schedules {
              id
              name
              description
              schedule {
                cron
                timezone
                enabled
              }
              enabled
              workflow {
                id
                version
                name
                nameSpace
              }
              properties
              propertiesFormId
              retry {
                attempts
                delay
              }
              timeout
              maxConcurrent
              lastRun
              nextRun
              runCount
              errorCount
              isRunning
            }
          }
        }
      `, { id: workflowId });

      const workflowSchedules = result.data?.workflowWithId?.schedules || [];
      setSchedules(workflowSchedules);
    } catch (err) {
      reactory.log('Error fetching workflow schedules', err, 'error');
      setSnackbar({ open: true, message: 'Failed to load schedules', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [workflow.name, workflow.nameSpace, workflow.version]);

  React.useEffect(() => {
    if (workflow?.name && workflow?.nameSpace && workflow?.version) {
      fetchSchedules();
    } else {
      setLoading(false);
    }
  }, [workflow.name, workflow.nameSpace, workflow.version]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormData({
      enabled: true,
      cron: '',
      name: '',
      description: '',
      propertiesFormId: '',
    });
    setActiveTab(0);
    setPropertiesData(null);
    setPropertiesJsonText('');
    setPropertiesJsonError('');
    setModalOpen(true);
  };

  const openEditModal = (schedule: ScheduleData) => {
    setEditingSchedule(schedule);
    setFormData(scheduleToFormData(schedule));
    setActiveTab(0);
    setPropertiesData(schedule.properties || null);
    const jsonText = schedule.properties ? JSON.stringify(schedule.properties, null, 2) : '';
    setPropertiesJsonText(jsonText);
    setPropertiesJsonError('');
    setModalOpen(true);
    handleMenuClose();
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSchedule(null);
    setFormData({});
    setActiveTab(0);
    setPropertiesData(null);
    setPropertiesJsonText('');
    setPropertiesJsonError('');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.cron) {
      setSnackbar({ open: true, message: 'Name and Cron Expression are required', severity: 'error' });
      return;
    }

    // Resolve properties: use propertiesData from ReactoryForm or parse JSON text
    let resolvedProperties = propertiesData;
    if (!formData.propertiesFormId && propertiesJsonText.trim()) {
      try {
        resolvedProperties = JSON.parse(propertiesJsonText);
      } catch {
        setSnackbar({ open: true, message: 'Invalid JSON in properties input', severity: 'error' });
        setActiveTab(1);
        return;
      }
    }

    setSaving(true);
    try {
      if (editingSchedule) {
        // Update existing schedule
        const updates = formDataToUpdateInput(formData, workflow, resolvedProperties);
        await reactory.graphqlMutation(UPDATE_SCHEDULE_MUTATION, {
          scheduleId: editingSchedule.id,
          updates,
        });
        setSnackbar({ open: true, message: `Schedule "${formData.name}" updated successfully`, severity: 'success' });
      } else {
        // Create new schedule
        const config = formDataToCreateInput(formData, workflow, resolvedProperties);
        await reactory.graphqlMutation(CREATE_SCHEDULE_MUTATION, { config });
        setSnackbar({ open: true, message: `Schedule "${formData.name}" created successfully`, severity: 'success' });
      }
      closeModal();
      await fetchSchedules();
    } catch (err: any) {
      reactory.log('Error saving schedule', err, 'error');
      const errMsg = err?.message || err?.toString() || 'Unknown error';
      setSnackbar({ open: true, message: `Failed to save schedule: ${errMsg}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (scheduleId: string) => {
    setDeletingScheduleId(scheduleId);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!deletingScheduleId) return;
    setDeleting(true);
    try {
      const result: any = await reactory.graphqlMutation(
        DELETE_SCHEDULE_MUTATION,
        { scheduleId: deletingScheduleId },
      );
      const opResult = result.data?.deleteWorkflowSchedule;
      if (opResult?.success) {
        setSnackbar({ open: true, message: opResult.message || 'Schedule deleted', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: opResult?.message || 'Failed to delete schedule', severity: 'error' });
      }
      setDeleteConfirmOpen(false);
      setDeletingScheduleId(null);
      await fetchSchedules();
    } catch (err: any) {
      reactory.log('Error deleting schedule', err, 'error');
      setSnackbar({ open: true, message: `Error deleting schedule: ${err?.message || err}`, severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleEnabled = async (schedule: ScheduleData) => {
    try {
      const newEnabled = !schedule.schedule?.enabled;
      await reactory.graphqlMutation(UPDATE_SCHEDULE_MUTATION, {
        scheduleId: schedule.id,
        updates: {
          schedule: {
            cron: schedule.schedule.cron,
            timezone: schedule.schedule.timezone,
            enabled: newEnabled,
          },
        },
      });
      setSnackbar({
        open: true,
        message: `Schedule "${schedule.name}" ${newEnabled ? 'enabled' : 'disabled'}`,
        severity: 'success',
      });
      await fetchSchedules();
    } catch (err: any) {
      reactory.log('Error toggling schedule', err, 'error');
      setSnackbar({ open: true, message: `Error toggling schedule: ${err?.message || err}`, severity: 'error' });
    }
    handleMenuClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, scheduleId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuScheduleId(scheduleId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuScheduleId(null);
  };

  const handleCronPresetClick = (cronValue: string) => {
    setFormData((prev: any) => ({ ...prev, cron: cronValue }));
  };

  const menuSchedule = schedules.find((s: any) => s.id === menuScheduleId);

  // -- Render --

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (schedules.length === 0) {
    return (
      <>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Icon sx={{ fontSize: 48, color: 'text.secondary' }}>schedule</Icon>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            No Schedules
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This workflow has no scheduled executions
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Icon>add</Icon>}
            onClick={openCreateModal}
          >
            Create Schedule
          </Button>
        </Box>

        {/* Schedule Editor Modal */}
        {renderModal()}

        {/* Snackbar */}
        {renderSnackbar()}
      </>
    );
  }

  /**
   * Renders the schedule editor modal with two tabs:
   * - Tab 0: Schedule Config (name, cron, timezone, retry, etc.)
   * - Tab 1: Properties Input (ReactoryForm when propertiesFormId is set, JSON textarea otherwise)
   */
  function renderModal() {

    /**
     * Handler for ReactoryForm onSubmit — stores the submitted properties data. 
     */
    const handlePropertiesFormSubmit = (data: any) => {
      setPropertiesData(data?.formData ?? data);
      setSnackbar({ open: true, message: 'Properties captured', severity: 'info' });
    };

    /**
     * Handler for ReactoryForm onChange — keeps properties data in sync.
     */
    const handlePropertiesFormChange = (data: any) => {
      setPropertiesData(data?.formData ?? data);
    };

    /**
     * Validates and parses JSON text from the fallback textarea.
     */
    const handleJsonTextChange = (text: string) => {
      setPropertiesJsonText(text);
      if (text.trim()) {
        try {
          JSON.parse(text);
          setPropertiesJsonError('');
        } catch (e: any) {
          setPropertiesJsonError(e.message || 'Invalid JSON');
        }
      } else {
        setPropertiesJsonError('');
      }
    };

    const renderScheduleConfigTab = () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {/* Schedule Name */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Name *</Typography>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e: any) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
            placeholder="My Schedule"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              fontSize: 14,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </Box>

        {/* Schedule ID (only for create) */}
        {!editingSchedule && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Schedule ID</Typography>
            <input
              type="text"
              value={formData.id || ''}
              onChange={(e: any) => setFormData((prev: any) => ({ ...prev, id: e.target.value }))}
              placeholder="Auto-generated if empty"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 4,
                fontSize: 14,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              A unique identifier for the schedule. Auto-generated from workflow name if left empty.
            </Typography>
          </Box>
        )}

        {/* Description */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Description</Typography>
          <textarea
            value={formData.description || ''}
            onChange={(e: any) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description"
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              fontSize: 14,
              fontFamily: 'inherit',
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </Box>

        {/* Cron Expression */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Cron Expression *</Typography>
          <input
            type="text"
            value={formData.cron || ''}
            onChange={(e: any) => setFormData((prev: any) => ({ ...prev, cron: e.target.value }))}
            placeholder="0 */6 * * *"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              fontSize: 14,
              fontFamily: 'monospace',
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {/* Cron Presets */}
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {CRON_PRESETS.map((preset) => (
              <Chip
                key={preset.value}
                label={preset.label}
                size="small"
                variant={formData.cron === preset.value ? 'filled' : 'outlined'}
                color={formData.cron === preset.value ? 'primary' : 'default'}
                onClick={() => handleCronPresetClick(preset.value)}
                sx={{ fontSize: 11, cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* Timezone */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Timezone</Typography>
          <input
            type="text"
            value={formData.timezone || ''}
            onChange={(e: any) => setFormData((prev: any) => ({ ...prev, timezone: e.target.value }))}
            placeholder="UTC"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              fontSize: 14,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </Box>

        {/* Enabled */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            type="checkbox"
            checked={formData.enabled !== false}
            onChange={(e: any) => setFormData((prev: any) => ({ ...prev, enabled: e.target.checked }))}
            style={{ width: 18, height: 18 }}
          />
          <Typography variant="subtitle2">Enabled</Typography>
        </Box>

        {/* Properties Form ID */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Properties Form ID</Typography>
          <input
            type="text"
            value={formData.propertiesFormId || ''}
            onChange={(e: any) => setFormData((prev: any) => ({ ...prev, propertiesFormId: e.target.value }))}
            placeholder="e.g. my-module.MyPropertiesForm@1.0.0"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              fontSize: 14,
              fontFamily: 'monospace',
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Optional Reactory form FQN to render a structured properties editor on the Properties tab.
            If not set, a JSON text input will be used instead.
          </Typography>
        </Box>

        {/* Advanced Settings */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1, mb: -1 }}>
          Advanced Settings
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Timeout (seconds)</Typography>
            <input
              type="number"
              value={formData.timeout || ''}
              onChange={(e: any) => setFormData((prev: any) => ({ ...prev, timeout: e.target.value ? Number.parseInt(e.target.value, 10) : undefined }))}
              placeholder="No timeout"
              min={0}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 4,
                fontSize: 13,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Max Concurrent</Typography>
            <input
              type="number"
              value={formData.maxConcurrent || ''}
              onChange={(e: any) => setFormData((prev: any) => ({ ...prev, maxConcurrent: e.target.value ? Number.parseInt(e.target.value, 10) : undefined }))}
              placeholder="Unlimited"
              min={1}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 4,
                fontSize: 13,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Retry Attempts</Typography>
            <input
              type="number"
              value={formData.retryAttempts || ''}
              onChange={(e: any) => setFormData((prev: any) => ({ ...prev, retryAttempts: e.target.value ? Number.parseInt(e.target.value, 10) : undefined }))}
              placeholder="0"
              min={0}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 4,
                fontSize: 13,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Retry Delay (seconds)</Typography>
            <input
              type="number"
              value={formData.retryDelay || ''}
              onChange={(e: any) => setFormData((prev: any) => ({ ...prev, retryDelay: e.target.value ? Number.parseInt(e.target.value, 10) : undefined }))}
              placeholder="0"
              min={0}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 4,
                fontSize: 13,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </Box>
        </Box>
      </Box>
    );

    const renderPropertiesTab = () => {
      const hasFormId = !!(formData.propertiesFormId?.trim());

      if (hasFormId && ReactoryForm) {
        // Render the ReactoryForm component for structured properties editing
        return (
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Editing properties using form: <strong>{formData.propertiesFormId}</strong>
            </Typography>
            {React.createElement(ReactoryForm, {
              formId: formData.propertiesFormId,
              formData: propertiesData,
              onChange: handlePropertiesFormChange,
              onSubmit: handlePropertiesFormSubmit,
            })}
          </Box>
        );
      }

      // Fallback: JSON textarea for manual properties input
      return (
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {hasFormId && !ReactoryForm
              ? 'ReactoryForm component not available. Using JSON input instead.'
              : 'No properties form configured. Enter properties as JSON below.'}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Properties (JSON)</Typography>
          <textarea
            value={propertiesJsonText}
            onChange={(e: any) => handleJsonTextChange(e.target.value)}
            placeholder='{\n  "key": "value"\n}'
            rows={12}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${propertiesJsonError ? theme.palette.error.main : theme.palette.divider}`,
              borderRadius: 4,
              fontSize: 13,
              fontFamily: 'monospace',
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {propertiesJsonError && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
              {propertiesJsonError}
            </Typography>
          )}
        </Box>
      );
    };

    return (
      <Dialog
        open={modalOpen}
        onClose={closeModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon color="primary">{editingSchedule ? 'edit_calendar' : 'add_alarm'}</Icon>
            <Typography variant="h6">
              {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
            </Typography>
          </Box>
          <IconButton onClick={closeModal} size="small">
            <Icon>close</Icon>
          </IconButton>
        </DialogTitle>
        <Tabs
          value={activeTab}
          onChange={(_: any, newValue: number) => setActiveTab(newValue)}
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Schedule Config" icon={<Icon sx={{ fontSize: 18 }}>settings</Icon>} iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab label="Properties" icon={<Icon sx={{ fontSize: 18 }}>tune</Icon>} iconPosition="start" sx={{ minHeight: 48 }} />
        </Tabs>
        <DialogContent dividers sx={{ minHeight: 300 }}>
          {activeTab === 0 && renderScheduleConfigTab()}
          {activeTab === 1 && renderPropertiesTab()}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeModal} disabled={saving}>
            Cancel
          </Button>
          {(() => {
            let buttonLabel = 'Create Schedule';
            if (saving) buttonLabel = 'Saving...';
            else if (editingSchedule) buttonLabel = 'Save Changes';
            const buttonIcon = editingSchedule ? 'save' : 'add';
            return (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.cron}
                startIcon={saving ? <CircularProgress size={16} /> : <Icon>{buttonIcon}</Icon>}
              >
                {buttonLabel}
              </Button>
            );
          })()}
        </DialogActions>
      </Dialog>
    );
  }

  /**
   * Renders the delete confirmation dialog
   */
  function renderDeleteConfirm() {
    const schedule = schedules.find((s: any) => s.id === deletingScheduleId);
    return (
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Schedule</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the schedule <strong>{schedule?.name || deletingScheduleId}</strong>?
            This will remove the YAML config file from disk.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Icon>delete</Icon>}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  /**
   * Renders the snackbar for notifications
   */
  function renderSnackbar() {
    return (
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev: any) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev: any) => ({ ...prev, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Schedules ({schedules.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh schedules">
            <IconButton size="small" onClick={fetchSchedules}>
              <Icon>refresh</Icon>
            </IconButton>
          </Tooltip>
          <Button 
            size="small"
            startIcon={<Icon>add</Icon>}
            onClick={openCreateModal}
          >
            Add Schedule
          </Button>
        </Box>
      </Box>

      {schedules.map((schedule: ScheduleData) => (
        <Box
          key={schedule.id}
          sx={{
            mb: 2,
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            transition: 'all 0.15s ease',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {schedule.name}
                </Typography>
                <Chip
                  label={schedule.schedule?.enabled ? 'ENABLED' : 'DISABLED'}
                  size="small"
                  color={schedule.schedule?.enabled ? 'success' : 'default'}
                  variant="outlined"
                  sx={{ fontSize: 10, height: 20 }}
                />
                {schedule.isRunning && (
                  <Chip
                    label="RUNNING"
                    size="small"
                    color="primary"
                    sx={{ fontSize: 10, height: 20 }}
                  />
                )}
              </Box>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {schedule.schedule?.cron}
                {schedule.schedule?.timezone && (
                  <span style={{ marginLeft: 8, fontFamily: 'inherit', opacity: 0.7 }}>
                    ({schedule.schedule.timezone})
                  </span>
                )}
              </Typography>
            </Box>

            {/* Action menu button */}
            <IconButton
              size="small"
              onClick={(e: any) => handleMenuOpen(e, schedule.id)}
            >
              <Icon>more_vert</Icon>
            </IconButton>
          </Box>

          {schedule.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {schedule.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
            {schedule.nextRun && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Icon sx={{ fontSize: 14, color: 'text.secondary' }}>schedule</Icon>
                <Typography variant="caption" color="text.secondary">
                  Next: {new Date(schedule.nextRun).toLocaleString()}
                </Typography>
              </Box>
            )}
            {schedule.lastRun && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Icon sx={{ fontSize: 14, color: 'text.secondary' }}>history</Icon>
                <Typography variant="caption" color="text.secondary">
                  Last: {new Date(schedule.lastRun).toLocaleString()}
                </Typography>
              </Box>
            )}
            {schedule.runCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Icon sx={{ fontSize: 14, color: 'text.secondary' }}>repeat</Icon>
                <Typography variant="caption" color="text.secondary">
                  Runs: {schedule.runCount}
                </Typography>
              </Box>
            )}
            {schedule.errorCount > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Icon sx={{ fontSize: 14, color: 'error.main' }}>error_outline</Icon>
                <Typography variant="caption" color="error.main">
                  Errors: {schedule.errorCount}
                </Typography>
              </Box>
            )}
            {schedule.retry && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Icon sx={{ fontSize: 14, color: 'text.secondary' }}>replay</Icon>
                <Typography variant="caption" color="text.secondary">
                  Retry: {schedule.retry.attempts}x / {schedule.retry.delay}s
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      ))}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuSchedule && openEditModal(menuSchedule)}>
          <ListItemIcon><Icon fontSize="small">edit</Icon></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuSchedule && handleToggleEnabled(menuSchedule)}>
          <ListItemIcon>
            <Icon fontSize="small">{menuSchedule?.schedule?.enabled ? 'pause' : 'play_arrow'}</Icon>
          </ListItemIcon>
          <ListItemText>{menuSchedule?.schedule?.enabled ? 'Disable' : 'Enable'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuScheduleId && confirmDelete(menuScheduleId)} sx={{ color: 'error.main' }}>
          <ListItemIcon><Icon fontSize="small" color="error">delete</Icon></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Schedule Editor Modal */}
      {renderModal()}

      {/* Delete Confirmation */}
      {renderDeleteConfirm()}

      {/* Snackbar */}
      {renderSnackbar()}
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowSchedule',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowSchedule,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowSchedule,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowSchedule 
  });
}
