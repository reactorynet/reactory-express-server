'use strict';

// @ts-nocheck

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface FeatureFlag {
  feature: string;
  partner?: string;
  organization?: string;
  businessUnit?: string;
  regions?: string[];
  roles?: string[];
  users?: string[];
  timezones?: string[];
  value?: any;
  enabled?: boolean;
}

interface CatalogueFlag {
  id?: string;
  nameSpace: string;
  name: string;
  version: string;
  title: string;
  description?: string;
}

interface ApplicationFeatureFlagsPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: {
    featureFlags?: FeatureFlag[];
    totalFeatureFlags?: number;
  };
  onChange?: (formData: any) => void;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const CATALOGUE_QUERY = `
  query ReactoryFeatureFlagCatalogue {
    ReactoryFeatureFlagCatalogue {
      id
      nameSpace
      name
      version
      title
      description
    }
  }
`;

const ApplicationFeatureFlagsPanel = (props: ApplicationFeatureFlagsPanelProps) => {
  const { reactory, formData, onChange, applicationId, mode = 'view' } = props;

  const { React, Material } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
  ]);

  const { useState, useEffect, useCallback } = React;

  const {
    Card,
    CardContent,
    CardHeader,
    Box,
    Typography,
    Divider,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemSecondaryAction,
    Chip,
    Switch,
    FormControlLabel,
    Alert,
    Tooltip,
    Autocomplete,
  } = Material.MaterialCore;

  const {
    Flag: FlagIcon,
    Add: AddIcon,
    Edit: EditIcon,
    Delete: DeleteIcon,
    Check: CheckIcon,
    Close: CloseIcon,
    ToggleOn: ToggleOnIcon,
    ToggleOff: ToggleOffIcon,
  } = Material.MaterialIcons;

  const featureFlags: FeatureFlag[] = formData?.featureFlags || [];
  const totalFeatureFlags = formData?.totalFeatureFlags || featureFlags.length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [editIndex, setEditIndex] = useState<number>(-1);
  const [isEditing, setIsEditing] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueFlag[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number>(-1);

  /**
   * Propagate changes back to the parent form via onChange.
   */
  const propagateChange = useCallback(
    (updatedFlags: FeatureFlag[]) => {
      if (typeof onChange === 'function') {
        onChange({
          ...formData,
          featureFlags: updatedFlags,
          totalFeatureFlags: updatedFlags.length,
        });
      }
    },
    [onChange, formData],
  );

  /**
   * Fetch feature flag catalogue from the server.
   */
  const fetchCatalogue = useCallback(async () => {
    setCatalogueLoading(true);
    try {
      const result = await reactory.graphql(CATALOGUE_QUERY);
      if (result?.data?.ReactoryFeatureFlagCatalogue) {
        setCatalogue(result.data.ReactoryFeatureFlagCatalogue);
      }
    } catch (err) {
      reactory.log('Error fetching feature flag catalogue:', err, 'warning');
    } finally {
      setCatalogueLoading(false);
    }
  }, [reactory]);

  // Fetch catalogue on mount
  useEffect(() => {
    if (reactory.hasRole(['ADMIN'])) {
      fetchCatalogue();
    }
  }, []);

  /**
   * Build FQN string for a catalogue flag.
   */
  const flagFqn = (f: CatalogueFlag): string =>
    `${f.nameSpace}.${f.name}@${f.version}`;

  /**
   * Get catalogue flags not already configured.
   */
  const availableCatalogueOptions = catalogue.filter(
    (cf) => !featureFlags.some((ff) => ff.feature === flagFqn(cf)),
  );

  /**
   * Toggle enabled/disabled state inline for a specific flag.
   */
  const handleToggleEnabled = (index: number) => {
    const updated = featureFlags.map((f, i) =>
      i === index ? { ...f, enabled: !f.enabled } : f,
    );
    propagateChange(updated);
  };

  /**
   * Open the add dialog for a new feature flag value.
   */
  const handleAddFlag = () => {
    setSelectedFlag({
      feature: '',
      partner: '',
      organization: '',
      businessUnit: '',
      regions: [],
      roles: [],
      timezones: [],
      value: {},
      enabled: true,
    });
    setEditIndex(-1);
    setIsEditing(false);
    setDialogOpen(true);
  };

  /**
   * Open the edit dialog for an existing feature flag value.
   */
  const handleEditFlag = (flag: FeatureFlag, index: number) => {
    setSelectedFlag({ ...flag });
    setEditIndex(index);
    setIsEditing(true);
    setDialogOpen(true);
  };

  /**
   * Prompt deletion confirmation for a feature flag value.
   */
  const handleDeleteFlag = (index: number) => {
    setDeleteIndex(index);
    setDeleteConfirmOpen(true);
  };

  /**
   * Execute deletion after confirmation.
   */
  const confirmDeleteFlag = () => {
    if (deleteIndex >= 0) {
      const updated = featureFlags.filter((_, i) => i !== deleteIndex);
      propagateChange(updated);
    }
    setDeleteConfirmOpen(false);
    setDeleteIndex(-1);
  };

  /**
   * Save (add or update) a feature flag value and propagate.
   */
  const handleSaveFlag = () => {
    if (!selectedFlag?.feature) return;

    let updated: FeatureFlag[];
    if (isEditing && editIndex >= 0) {
      updated = featureFlags.map((f, i) =>
        i === editIndex ? { ...selectedFlag } : f,
      );
    } else {
      updated = [...featureFlags, { ...selectedFlag }];
    }

    propagateChange(updated);
    setDialogOpen(false);
    setSelectedFlag(null);
    setEditIndex(-1);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedFlag(null);
    setEditIndex(-1);
  };

  const handleFieldChange = (field: string, value: any) => {
    setSelectedFlag((prev: FeatureFlag | null) => ({ ...prev, [field]: value }));
  };

  /**
   * Handle catalogue selection in the add dialog.
   */
  const handleCatalogueSelect = (
    _event: any,
    catalogueFlag: CatalogueFlag | null,
  ) => {
    if (catalogueFlag) {
      handleFieldChange('feature', flagFqn(catalogueFlag));
    }
  };

  const isAdmin = reactory.hasRole(['ADMIN']);

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader
          avatar={<FlagIcon />}
          title="Feature Flags"
          subheader={`${featureFlags.length} configured flag${featureFlags.length !== 1 ? 's' : ''}`}
          action={
            isAdmin && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={handleAddFlag}
              >
                Add Flag
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {!isAdmin && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Only administrators can manage feature flags.
            </Alert>
          )}
          {featureFlags.length > 0 ? (
            <List disablePadding>
              {featureFlags.map((flag: FeatureFlag, index: number) => (
                <ListItem
                  key={flag.feature || index}
                  divider
                  sx={{
                    opacity: flag.enabled ? 1 : 0.6,
                    backgroundColor: flag.enabled
                      ? 'inherit'
                      : 'action.disabledBackground',
                    py: 1.5,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    {isAdmin ? (
                      <Tooltip
                        title={flag.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleToggleEnabled(index)}
                          color={flag.enabled ? 'success' : 'default'}
                        >
                          {flag.enabled ? (
                            <ToggleOnIcon />
                          ) : (
                            <ToggleOffIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    ) : flag.enabled ? (
                      <CheckIcon color="success" />
                    ) : (
                      <CloseIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {flag.feature}
                        </Typography>
                        <Chip
                          label={flag.enabled ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={flag.enabled ? 'success' : 'error'}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {flag.roles && flag.roles.length > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.5,
                              flexWrap: 'wrap',
                              mb: 0.5,
                              alignItems: 'center',
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mr: 0.5 }}
                            >
                              Roles:
                            </Typography>
                            {flag.roles.map((role: string) => (
                              <Chip key={role} label={role} size="small" />
                            ))}
                          </Box>
                        )}
                        {flag.regions && flag.regions.length > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.5,
                              flexWrap: 'wrap',
                              mb: 0.5,
                              alignItems: 'center',
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mr: 0.5 }}
                            >
                              Regions:
                            </Typography>
                            {flag.regions.map((region: string) => (
                              <Chip
                                key={region}
                                label={region}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                        {flag.timezones && flag.timezones.length > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.5,
                              flexWrap: 'wrap',
                              mb: 0.5,
                              alignItems: 'center',
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mr: 0.5 }}
                            >
                              Timezones:
                            </Typography>
                            {flag.timezones.map((tz: string) => (
                              <Chip
                                key={tz}
                                label={tz}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                        {flag.partner && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Partner: {flag.partner}
                          </Typography>
                        )}
                        {flag.organization && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Organization: {flag.organization}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  {isAdmin && (
                    <ListItemSecondaryAction>
                      <Tooltip title="Edit flag targeting">
                        <IconButton
                          size="small"
                          onClick={() => handleEditFlag(flag, index)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete flag">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteFlag(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              No feature flags configured. Feature flags allow you to toggle
              functionality and control feature rollouts for your application.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Feature Flag Edit/Create Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? 'Edit Feature Flag' : 'Add Feature Flag'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Feature selection: catalogue autocomplete for add, read-only for edit */}
            {isEditing ? (
              <TextField
                label="Feature Key (FQN)"
                value={selectedFlag?.feature || ''}
                fullWidth
                disabled
                helperText="Feature key cannot be changed after creation"
              />
            ) : (
              <Autocomplete
                options={availableCatalogueOptions}
                loading={catalogueLoading}
                getOptionLabel={(option: CatalogueFlag) =>
                  `${option.title} (${flagFqn(option)})`
                }
                onChange={handleCatalogueSelect}
                freeSolo
                renderOption={(optionProps: any, option: CatalogueFlag) => (
                  <Box component="li" {...optionProps}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {option.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {flagFqn(option)}
                        {option.description
                          ? ` — ${option.description}`
                          : ''}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    label="Feature Flag"
                    value={selectedFlag?.feature || ''}
                    onChange={(e: any) =>
                      handleFieldChange('feature', e.target.value)
                    }
                    fullWidth
                    helperText="Select from the catalogue or enter an FQN manually"
                  />
                )}
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={selectedFlag?.enabled !== false}
                  onChange={(e: any) =>
                    handleFieldChange('enabled', e.target.checked)
                  }
                />
              }
              label="Enabled"
            />
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" color="text.secondary">
              Targeting (Optional)
            </Typography>
            <TextField
              label="Partner"
              value={selectedFlag?.partner || ''}
              onChange={(e: any) =>
                handleFieldChange('partner', e.target.value)
              }
              fullWidth
              helperText="Apply to specific partner only"
            />
            <TextField
              label="Organization"
              value={selectedFlag?.organization || ''}
              onChange={(e: any) =>
                handleFieldChange('organization', e.target.value)
              }
              fullWidth
              helperText="Apply to specific organization only"
            />
            <TextField
              label="Business Unit"
              value={selectedFlag?.businessUnit || ''}
              onChange={(e: any) =>
                handleFieldChange('businessUnit', e.target.value)
              }
              fullWidth
              helperText="Apply to specific business unit only"
            />
            <TextField
              label="Roles"
              value={selectedFlag?.roles?.join(', ') || ''}
              onChange={(e: any) =>
                handleFieldChange(
                  'roles',
                  e.target.value
                    .split(',')
                    .map((r: string) => r.trim())
                    .filter(Boolean),
                )
              }
              fullWidth
              helperText="Comma-separated list of roles that can access this feature"
            />
            <TextField
              label="Regions"
              value={selectedFlag?.regions?.join(', ') || ''}
              onChange={(e: any) =>
                handleFieldChange(
                  'regions',
                  e.target.value
                    .split(',')
                    .map((r: string) => r.trim())
                    .filter(Boolean),
                )
              }
              fullWidth
              helperText="Comma-separated list of 2-digit ISO country codes"
            />
            <TextField
              label="Timezones"
              value={selectedFlag?.timezones?.join(', ') || ''}
              onChange={(e: any) =>
                handleFieldChange(
                  'timezones',
                  e.target.value
                    .split(',')
                    .map((t: string) => t.trim())
                    .filter(Boolean),
                )
              }
              fullWidth
              helperText="Comma-separated list of timezones"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button
            onClick={handleSaveFlag}
            variant="contained"
            disabled={!selectedFlag?.feature}
          >
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove the feature flag
            {deleteIndex >= 0 && featureFlags[deleteIndex]
              ? ` "${featureFlags[deleteIndex].feature}"`
              : ''}
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteFlag}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationFeatureFlagsPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationFeatureFlagsPanel,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'feature-flags', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationFeatureFlagsPanel,
    [''],
    ComponentDefinition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    fqn: FQN,
    componentFqn: FQN,
    component: ApplicationFeatureFlagsPanel,
  });
}
