import Reactory from '@reactorynet/reactory-core';

interface WorkflowYamlViewProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow: any;
  /** If true the editor is read-only (default: false) */
  readonly?: boolean;
  /** Height of the editor area (CSS value, default: '60vh') */
  editorHeight?: string;
}

interface YamlLoadError {
  stage: 'REGISTRY' | 'FILE_RESOLVE' | 'FILE_READ' | 'PARSE' | 'VALIDATION';
  message: string;
  code?: string;
  line?: number;
  column?: number;
}

interface WorkflowValidationError {
  field?: string | null;
  message: string;
  code?: string | null;
}

interface YamlLoadDeps {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  RichEditor?: any;
  RichEditorWidget?: any;
}

// ────────────────────────────────────────────────────────────────────────────
// Query / mutation definitions (static – defined outside to avoid re-creation)
// ────────────────────────────────────────────────────────────────────────────
const SAVE_WORKFLOW_YAML_MUTATION = `
  mutation SaveWorkflowYaml($input: SaveWorkflowYamlInput!) {
    saveWorkflowYaml(input: $input) {
      nameSpace
      name
      version
      yamlSource
      sourceType
      location
      loadStatus
      errors {
        stage
        message
        code
        line
        column
      }
      validationErrors {
        field
        message
        code
      }
    }
  }
`;

const YAML_DEFINITION_QUERY = `
  query GetWorkflowYamlDefinition(
    $nameSpace: String!
    $name: String!
    $version: String
  ) {
    workflowYamlDefinition(
      nameSpace: $nameSpace
      name: $name
      version: $version
    ) {
      nameSpace
      name
      version
      description
      yamlSource
      sourceType
      location
      loadStatus
      errors {
        stage
        message
        code
        line
        column
      }
      validationErrors {
        field
        message
        code
      }
    }
  }
`;

// ────────────────────────────────────────────────────────────────────────────
// Source type label helpers
// ────────────────────────────────────────────────────────────────────────────
const SOURCE_TYPE_LABEL: Record<string, string> = {
  MODULE: 'Module',
  CATALOG: 'Catalog',
  USER: 'User Directory',
};

const SOURCE_TYPE_COLOR: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'default'> = {
  MODULE: 'primary',
  CATALOG: 'secondary',
  USER: 'warning',
};

// ────────────────────────────────────────────────────────────────────────────
// Load status helpers
// ────────────────────────────────────────────────────────────────────────────
const STATUS_SEVERITY: Record<string, 'error' | 'warning' | 'success' | 'info'> = {
  SUCCESS: 'success',
  PARTIAL: 'warning',
  NOT_FOUND: 'error',
  IO_ERROR: 'error',
  PARSE_ERROR: 'error',
  REGISTRY_ERROR: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: 'Loaded successfully',
  PARTIAL: 'Loaded with warnings',
  NOT_FOUND: 'File not found',
  IO_ERROR: 'File read error',
  PARSE_ERROR: 'YAML parse error',
  REGISTRY_ERROR: 'Registry error',
};

// Rich text editors (Froala / Quill) create heavyweight DOM structures per
// line.  Above this threshold we fall back to a plain <pre> to avoid OOM
// crashes and infinite onChange re-render loops.
const LARGE_CONTENT_THRESHOLD = 200 * 1024; // 200 KB

/**
 * WorkflowYamlView
 *
 * Displays the raw YAML source for a YAML-type workflow in an editable
 * rich-text editor. Load errors are shown as alert banners at the top of
 * the panel, grouped by processing stage, so users can see exactly where
 * and why loading failed.
 *
 * The component makes its own `workflowYamlDefinition` query rather than
 * relying on the parent to pass down the raw source, which means it can be
 * used stand-alone in any tab context.
 */
const WorkflowYamlView = (props: WorkflowYamlViewProps) => {
  const { reactory, workflow, readonly = false, editorHeight = '60vh' } = props;

  if (!workflow) {
    return null;
  }

  const {
    React,
    Material,
    RichEditorWidget,
  } = reactory.getComponents<YamlLoadDeps>([
    'react.React',
    'material-ui.Material',
    'core.RichEditorWidget',
  ]);

  const { MaterialCore } = Material;
  const {
    Box,
    Typography,
    Alert,
    AlertTitle,
    Chip,
    Icon,
    IconButton,
    Tooltip,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField
  } = MaterialCore;

  const [loading, setLoading] = React.useState(true);
  const [yamlSource, setYamlSource] = React.useState<string>('');
  const [loadStatus, setLoadStatus] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<YamlLoadError[]>([]);
  const [validationErrors, setValidationErrors] = React.useState<WorkflowValidationError[]>([]);
  const [sourceType, setSourceType] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [errorsExpanded, setErrorsExpanded] = React.useState(true);
  const [validationExpanded, setValidationExpanded] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!workflow?.nameSpace || !workflow?.name) return;
    setLoading(true);

    reactory.graphqlQuery<{ workflowYamlDefinition: any }, any>(
      YAML_DEFINITION_QUERY,
      {
        nameSpace: workflow.nameSpace,
        name: workflow.name,
        version: workflow.version,
      }
    ).then((response: any) => {
      const def = response?.data?.workflowYamlDefinition;
      if (!def) {
        setErrors([{ stage: 'REGISTRY', message: 'No response received from server', code: 'NO_RESPONSE' }]);
        setLoadStatus('NOT_FOUND');
        return;
      }
      setYamlSource(def.yamlSource || '');
      setLoadStatus(def.loadStatus || 'SUCCESS');
      setErrors(def.errors || []);
      setValidationErrors(def.validationErrors || []);
      setSourceType(def.sourceType || null);
      setLocation(def.location || null);
    }).catch((err: any) => {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors([{ stage: 'REGISTRY', message: msg, code: 'NETWORK_ERROR' }]);
      setLoadStatus('NOT_FOUND');
    }).finally(() => {
      setLoading(false);
    });
  }, [workflow?.nameSpace, workflow?.name, workflow?.version]);

  const handleCopy = () => {
    if (yamlSource) {
      navigator.clipboard.writeText(yamlSource).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleEditorChange = (value: string) => {
    if (!readonly && value !== yamlSource) {
      setYamlSource(value);
      // Clear any previous save status when the user edits
      setSaveSuccess(false);
      setSaveError(null);
    }
  };

  const handleSave = () => {
    if (!workflow?.nameSpace || !workflow?.name || !workflow?.version) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    reactory.graphqlMutation<{ saveWorkflowYaml: any }, any>(
      SAVE_WORKFLOW_YAML_MUTATION,
      {
        input: {
          nameSpace: workflow.nameSpace,
          name: workflow.name,
          version: workflow.version,
          yamlContent: yamlSource,
        },
      }
    ).then((response: any) => {
      const def = response?.data?.saveWorkflowYaml;
      if (!def) {
        setSaveError('No response received from server');
        return;
      }
      if (def.loadStatus === 'PARSE_ERROR' || def.loadStatus === 'NOT_FOUND') {
        const firstError = def.errors?.[0];
        setSaveError(firstError ? `[${firstError.code || firstError.stage}] ${firstError.message}` : 'Save failed');
        return;
      }
      // Update component state with the freshly saved definition
      setYamlSource(def.yamlSource || yamlSource);
      setLoadStatus(def.loadStatus || 'SUCCESS');
      setErrors(def.errors || []);
      setValidationErrors(def.validationErrors || []);
      setSourceType(def.sourceType || null);
      setLocation(def.location || null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }).catch((err: any) => {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg);
    }).finally(() => {
      setSaving(false);
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, minHeight: 200 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Loading YAML definition…
        </Typography>
      </Box>
    );
  }

  const hasCriticalErrors = errors.length > 0 && loadStatus !== 'SUCCESS' && loadStatus !== 'PARTIAL';

  // Group errors by stage for cleaner display
  const errorsByStage = errors.reduce<Record<string, YamlLoadError[]>>((acc, err) => {
    if (!acc[err.stage]) acc[err.stage] = [];
    acc[err.stage].push(err);
    return acc;
  }, {});

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 0, width: 0, minWidth: '100%', overflow: 'hidden' }}>

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Icon sx={{ fontSize: 18, color: 'text.secondary' }}>description</Icon>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          YAML Source
        </Typography>

        {/* Load status chip */}
        {loadStatus && (
          <Chip
            size="small"
            icon={<Icon sx={{ fontSize: 14 }}>{loadStatus === 'SUCCESS' ? 'check_circle' : 'error'}</Icon>}
            label={STATUS_LABEL[loadStatus] || loadStatus}
            color={STATUS_SEVERITY[loadStatus] === 'success' ? 'success' : STATUS_SEVERITY[loadStatus] === 'warning' ? 'warning' : 'error'}
            variant="outlined"
          />
        )}

        {/* Validation errors chip */}
        {validationErrors.length > 0 && (
          <Chip
            size="small"
            icon={<Icon sx={{ fontSize: 14 }}>rule</Icon>}
            label={`${validationErrors.length} validation ${validationErrors.length === 1 ? 'error' : 'errors'}`}
            color="warning"
            variant="outlined"
            onClick={() => setValidationExpanded(!validationExpanded)}
            sx={{ cursor: 'pointer' }}
          />
        )}

        {/* Source type chip */}
        {sourceType && (
          <Chip
            size="small"
            icon={<Icon sx={{ fontSize: 14 }}>storage</Icon>}
            label={SOURCE_TYPE_LABEL[sourceType] || sourceType}
            color={SOURCE_TYPE_COLOR[sourceType] || 'default'}
            variant="outlined"
          />
        )}

        {/* Copy button */}
        {yamlSource && (
          <Tooltip title={copied ? 'Copied!' : 'Copy YAML'}>
            <IconButton size="small" onClick={handleCopy}>
              <Icon sx={{ fontSize: 18 }}>{copied ? 'check' : 'content_copy'}</Icon>
            </IconButton>
          </Tooltip>
        )}

        {/* Save button (hidden in readonly mode) */}
        {!readonly && (
          <Tooltip title={saveSuccess ? 'Saved!' : 'Save YAML'}>
            <span>
              <IconButton
                size="small"
                onClick={handleSave}
                disabled={saving || !yamlSource}
                color={saveSuccess ? 'success' : 'default'}
              >
                {saving
                  ? <CircularProgress size={18} />
                  : <Icon sx={{ fontSize: 18 }}>{saveSuccess ? 'check' : 'save'}</Icon>
                }
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* ── File path info ───────────────────────────────────────── */}
      {location && (
        <Box sx={{ px: 2, py: 0.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {location}
          </Typography>
        </Box>
      )}

      {/* ── Save error banner ────────────────────────────────────────────── */}
      {saveError && (
        <Alert
          severity="error"
          variant="standard"
          onClose={() => setSaveError(null)}
          sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}
        >
          <AlertTitle sx={{ fontSize: '0.8rem' }}>Save failed</AlertTitle>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {saveError}
          </Typography>
        </Alert>
      )}

      {/* ── Error banners ─────────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <Box sx={{ mx: 0, mt: 0 }}>
          <Accordion
            expanded={errorsExpanded}
            onChange={(_: any, expanded: boolean) => setErrorsExpanded(expanded)}
            disableGutters
            elevation={0}
            sx={{ border: 0, borderBottom: 1, borderColor: 'divider', '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<Icon>expand_more</Icon>} sx={{ bgcolor: 'error.light', color: 'error.contrastText', minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
              <Icon sx={{ mr: 1, fontSize: 18 }}>warning_amber</Icon>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {errors.length} load {errors.length === 1 ? 'error' : 'errors'} — {STATUS_LABEL[loadStatus || ''] || loadStatus}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {Object.entries(errorsByStage).map(([stage, stageErrors]) => (
                <Alert
                  key={stage}
                  severity={STATUS_SEVERITY[loadStatus || 'NOT_FOUND'] || 'error'}
                  variant="standard"
                  icon={<Icon sx={{ fontSize: 18 }}>error_outline</Icon>}
                  sx={{ borderRadius: 0, '& + &': { borderTop: 1, borderColor: 'divider' } }}
                >
                  <AlertTitle sx={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                    Stage: {stage.toLowerCase().replace('_', ' ')}
                  </AlertTitle>
                  {stageErrors.map((err, i) => (
                    <Box key={i} sx={{ mb: stageErrors.length > 1 && i < stageErrors.length - 1 ? 1 : 0 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {err.code && <strong>[{err.code}]</strong>} {err.message}
                        {err.line != null && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            (line {err.line}{err.column != null ? `, col ${err.column}` : ''})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  ))}
                </Alert>
              ))}
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* ── Validation errors ────────────────────────────────────────────── */}
      {validationErrors.length > 0 && (
        <Box sx={{ mx: 0, mt: 0 }}>
          <Accordion
            expanded={validationExpanded}
            onChange={(_: any, expanded: boolean) => setValidationExpanded(expanded)}
            disableGutters
            elevation={0}
            sx={{ border: 0, borderBottom: 1, borderColor: 'divider', '&:before': { display: 'none' } }}
          >
            <AccordionSummary
              expandIcon={<Icon>expand_more</Icon>}
              sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
            >
              <Icon sx={{ mr: 1, fontSize: 18 }}>rule</Icon>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {validationErrors.length} step validation {validationErrors.length === 1 ? 'error' : 'errors'}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {validationErrors.map((ve, i) => (
                <Alert
                  key={i}
                  severity="warning"
                  variant="standard"
                  icon={<Icon sx={{ fontSize: 18 }}>error_outline</Icon>}
                  sx={{ borderRadius: 0, '& + &': { borderTop: 1, borderColor: 'divider' } }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                    {ve.field && (
                      <Chip
                        label={ve.field}
                        size="small"
                        variant="outlined"
                        color="warning"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem', height: 20 }}
                      />
                    )}
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {ve.code && <strong>[{ve.code}] </strong>}{ve.message}
                    </Typography>
                  </Box>
                </Alert>
              ))}
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      {/* ── YAML editor ──────────────────────────────────────────────────── */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        {hasCriticalErrors && !yamlSource ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 2, p: 4 }}>
            <Icon sx={{ fontSize: 48, color: 'error.main' }}>broken_image</Icon>
            <Typography variant="body1" color="error.main" align="center">
              YAML source could not be loaded.
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Review the errors above for details.
            </Typography>
          </Box>
        ) : yamlSource.length > LARGE_CONTENT_THRESHOLD ? (
          /* Large content: plain <pre> to avoid rich-editor OOM / onChange loops */
          <Box sx={{ height: editorHeight, display: 'flex', flexDirection: 'column', maxWidth: '100%', overflowX: 'auto' }}>
            <Alert severity="info" sx={{ borderRadius: 0, flexShrink: 0 }}>
              YAML source is {(yamlSource.length / 1024).toFixed(0)} KB — displayed
              read-only for performance. Use the copy button to edit externally.
            </Alert>
            <Box sx={{
              flex: 1,
              overflow: 'auto',
              bgcolor: 'grey.900',
              color: 'grey.100',
              maxWidth: '100%',
            }}>
              <pre style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '0.8125rem',
                lineHeight: 1.6,
                padding: '12px 16px',
                margin: 0,
                whiteSpace: 'pre',
                wordBreak: 'normal',
                overflowWrap: 'normal',
                color: 'inherit',
                minWidth: 'fit-content',
              }}>
                {yamlSource}
              </pre>
            </Box>
          </Box>
        ) : RichEditorWidget ? (
          <Box sx={{ height: editorHeight, overflow: 'hidden' }}>
            <RichEditorWidget
              idSchema={{ $id: 'workflow-yaml-editor' }}
              formData={yamlSource}
              format="yaml"
              height={editorHeight}
              onChange={handleEditorChange}
            />
          </Box>
        ) : (
          <Box sx={{ height: editorHeight, maxWidth: '100%', overflowX: 'auto' }}>
            <TextField
              multiline
              fullWidth
              value={yamlSource}
              onChange={(e: any) => handleEditorChange(e.target.value)}
              InputProps={{
                readOnly: readonly,
                style: {
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  padding: '12px 16px',
                },
                disableUnderline: true,
              }}
              variant="standard"
              sx={{
                height: editorHeight,
                '& .MuiInputBase-root': {
                  height: '100%',
                  alignItems: 'flex-start',
                  bgcolor: 'grey.50',
                },
                '& .MuiInputBase-input': {
                  height: '100% !important',
                  overflowY: 'auto !important',
                },
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowYamlView',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowYamlView,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR'],
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowYamlView,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: WorkflowYamlView,
  });
}
