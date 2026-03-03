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
  timezones?: string[];
  value?: any;
  enabled?: boolean;
}

interface ApplicationFeatureFlagsPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: {
    featureFlags?: FeatureFlag[];
    totalFeatureFlags?: number;
  };
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const ApplicationFeatureFlagsPanel = (props: ApplicationFeatureFlagsPanelProps) => {
  const { reactory, formData, applicationId, mode = 'view' } = props;

  const { React, Material } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
  ]);

  const { useState } = React;

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
  } = Material.MaterialCore;

  const {
    Flag: FlagIcon,
    Add: AddIcon,
    Edit: EditIcon,
    Delete: DeleteIcon,
    Check: CheckIcon,
    Close: CloseIcon,
  } = Material.MaterialIcons;

  const featureFlags = formData?.featureFlags || [];
  const totalFeatureFlags = formData?.totalFeatureFlags || featureFlags.length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditFlag = (flag: FeatureFlag) => {
    setSelectedFlag({ ...flag });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteFlag = async (feature: string) => {
    if (confirm('Are you sure you want to delete this feature flag?')) {
      try {
        // TODO: Implement delete mutation
        reactory.log('Delete feature flag:', feature);
      } catch (error) {
        reactory.log('Error deleting feature flag:', error);
      }
    }
  };

  const handleSaveFlag = async () => {
    try {
      // TODO: Implement save/update mutation
      reactory.log(isEditing ? 'Update feature flag:' : 'Create feature flag:', selectedFlag);
      setDialogOpen(false);
      setSelectedFlag(null);
    } catch (error) {
      reactory.log('Error saving feature flag:', error);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedFlag(null);
  };

  const handleFieldChange = (field: string, value: any) => {
    setSelectedFlag({ ...selectedFlag, [field]: value });
  };

  const isAdmin = reactory.hasRole(['ADMIN']);

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader
          avatar={<FlagIcon />}
          title="Feature Flags"
          subheader={`Total: ${totalFeatureFlags}`}
          action={
            isAdmin && mode === 'edit' && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={handleAddFlag}
              >
                Add Feature Flag
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
            <List>
              {featureFlags.map((flag: FeatureFlag, index: number) => (
                <ListItem
                  key={flag.feature || index}
                  divider
                  sx={{
                    opacity: flag.enabled !== false ? 1 : 0.6,
                    backgroundColor: flag.enabled !== false ? 'inherit' : 'action.disabledBackground',
                  }}
                >
                  <ListItemIcon>
                    {flag.enabled !== false ? (
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
                        {flag.enabled === false && (
                          <Chip label="Disabled" size="small" color="error" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {flag.roles && flag.roles.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                              Roles:
                            </Typography>
                            {flag.roles.map((role: string) => (
                              <Chip key={role} label={role} size="small" />
                            ))}
                          </Box>
                        )}
                        {flag.regions && flag.regions.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                              Regions:
                            </Typography>
                            {flag.regions.map((region: string) => (
                              <Chip key={region} label={region} size="small" variant="outlined" />
                            ))}
                          </Box>
                        )}
                        {flag.partner && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Partner: {flag.partner}
                          </Typography>
                        )}
                        {flag.organization && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Organization: {flag.organization}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  {isAdmin && mode === 'edit' && (
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => handleEditFlag(flag)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteFlag(flag.feature)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No feature flags configured. Feature flags allow you to toggle functionality
              and control feature rollouts for your application.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Feature Flag Edit/Create Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Feature Flag' : 'Add New Feature Flag'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Feature Key"
              value={selectedFlag?.feature || ''}
              onChange={(e) => handleFieldChange('feature', e.target.value)}
              fullWidth
              helperText="Unique identifier for the feature flag (e.g., 'beta-dashboard', 'new-reports')"
              disabled={isEditing}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={selectedFlag?.enabled !== false}
                  onChange={(e) => handleFieldChange('enabled', e.target.checked)}
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
              onChange={(e) => handleFieldChange('partner', e.target.value)}
              fullWidth
              helperText="Apply to specific partner only"
            />
            <TextField
              label="Organization"
              value={selectedFlag?.organization || ''}
              onChange={(e) => handleFieldChange('organization', e.target.value)}
              fullWidth
              helperText="Apply to specific organization only"
            />
            <TextField
              label="Business Unit"
              value={selectedFlag?.businessUnit || ''}
              onChange={(e) => handleFieldChange('businessUnit', e.target.value)}
              fullWidth
              helperText="Apply to specific business unit only"
            />
            <TextField
              label="Roles"
              value={selectedFlag?.roles?.join(', ') || ''}
              onChange={(e) => handleFieldChange('roles', e.target.value.split(',').map((r: string) => r.trim()).filter(Boolean))}
              fullWidth
              helperText="Comma-separated list of roles that can access this feature"
            />
            <TextField
              label="Regions"
              value={selectedFlag?.regions?.join(', ') || ''}
              onChange={(e) => handleFieldChange('regions', e.target.value.split(',').map((r: string) => r.trim()).filter(Boolean))}
              fullWidth
              helperText="Comma-separated list of 2-digit ISO country codes"
            />
            <TextField
              label="Timezones"
              value={selectedFlag?.timezones?.join(', ') || ''}
              onChange={(e) => handleFieldChange('timezones', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
              fullWidth
              helperText="Comma-separated list of timezones"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSaveFlag} variant="contained">
            {isEditing ? 'Update' : 'Create'}
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
