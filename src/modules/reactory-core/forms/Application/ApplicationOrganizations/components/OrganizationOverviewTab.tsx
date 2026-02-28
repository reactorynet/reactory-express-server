'use strict';

interface OrganizationOverviewTabDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface OrganizationOverviewTabProps {
  reactory: Reactory.Client.IReactoryApi;
  organization: any;
  refreshKey?: number;
  onRefresh?: () => void;
}

/**
 * OrganizationOverviewTab Component
 *
 * Displays and allows editing of general organization information:
 * - Name, code, trading name
 * - Logo and avatar display
 * - Created/updated timestamps
 */
const OrganizationOverviewTab = (props: OrganizationOverviewTabProps) => {
  const { reactory, organization, onRefresh } = props;

  const { React, Material } = reactory.getComponents<OrganizationOverviewTabDependencies>([
    'react.React',
    'material-ui.Material',
  ]);

  const { useState, useCallback } = React;

  const {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    CardHeader,
    Grid,
    Avatar,
    Divider,
    IconButton,
    Tooltip,
  } = Material.MaterialCore;

  const {
    Edit: EditIcon,
    Save: SaveIcon,
    Cancel: CancelIcon,
    Business: BusinessIcon,
  } = Material.MaterialIcons;

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: organization.name || '',
    code: organization.code || '',
    tradingName: organization.tradingName || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = useCallback((field: string) => (event: any) => {
    setEditData((prev: any) => ({ ...prev, [field]: event.target.value }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const mutation = `mutation updateOrganization($id: String!, $input: UpdateOrganizationInput!) {
        updateOrganization(id: $id, input: $input) {
          id
          name
          code
          updatedAt
        }
      }`;

      await reactory.graphqlMutation(mutation, {
        id: organization.id,
        input: {
          name: editData.name,
          code: editData.code,
        }
      });

      reactory.createNotification('Organization updated successfully', { showInAppNotification: true, type: 'success' });
      setIsEditing(false);
      reactory.amq.raiseFormEvent('core.OrganizationUpdatedEvent', {}, 'core.OrganizationUpdatedEvent');
      if (onRefresh) onRefresh();
    } catch (error: any) {
      reactory.createNotification(
        `Failed to update organization: ${error.message || 'Unknown error'}`,
        { showInAppNotification: true, type: 'error' }
      );
    } finally {
      setIsSaving(false);
    }
  }, [organization.id, editData, reactory, onRefresh]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditData({
      name: organization.name || '',
      code: organization.code || '',
      tradingName: organization.tradingName || '',
    });
  }, [organization]);

  return (
    <Box sx={{ p: 2 }}>
      <Card variant="outlined">
        <CardHeader
          avatar={
            <Avatar src={organization.avatarURL || organization.logoURL} alt={organization.name}>
              <BusinessIcon />
            </Avatar>
          }
          title="Organization Details"
          subheader={`ID: ${organization.id}`}
          action={
            !isEditing ? (
              <Tooltip title="Edit">
                <IconButton onClick={() => setIsEditing(true)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Save">
                  <IconButton onClick={handleSave} disabled={isSaving} color="primary">
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel">
                  <IconButton onClick={handleCancelEdit} disabled={isSaving}>
                    <CancelIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {isEditing ? (
                <TextField
                  label="Organization Name"
                  value={editData.name}
                  onChange={handleFieldChange('name')}
                  fullWidth
                  required
                />
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">Organization Name</Typography>
                  <Typography variant="body1">{organization.name || '—'}</Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              {isEditing ? (
                <TextField
                  label="Code"
                  value={editData.code}
                  onChange={handleFieldChange('code')}
                  fullWidth
                />
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary">Code</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{organization.code || '—'}</Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="caption" color="text.secondary">Trading Name</Typography>
                <Typography variant="body1">{organization.tradingName || '—'}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="caption" color="text.secondary">Business Units</Typography>
                <Typography variant="body1">{organization.businessUnits?.length || 0}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body1">
                  {organization.createdAt ? new Date(organization.createdAt).toLocaleString() : '—'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                <Typography variant="body1">
                  {organization.updatedAt ? new Date(organization.updatedAt).toLocaleString() : '—'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

const Definition = {
  name: 'OrganizationOverviewTab',
  nameSpace: 'core',
  version: '1.0.0',
  component: OrganizationOverviewTab,
  roles: ['USER', 'ADMIN']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    OrganizationOverviewTab,
    ['Organization'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: OrganizationOverviewTab
  });
}
