'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationRoutesPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const ApplicationRoutesPanel = (props: ApplicationRoutesPanelProps) => {
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
    List,
    ListItem,
    ListItemText,
    Chip,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Switch,
    FormControlLabel,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
  } = Material.MaterialCore;

  const {
    Route: RouteIcon,
    Add: AddIcon,
    Edit: EditIcon,
    Delete: DeleteIcon,
    Lock: LockIcon,
    LockOpen: LockOpenIcon,
  } = Material.MaterialIcons;

  const routes = formData?.routes || [];
  const totalRoutes = formData?.totalRoutes || routes.length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleAddRoute = () => {
    setSelectedRoute({
      key: '',
      path: '',
      title: '',
      exact: true,
      public: false,
      roles: [],
      componentFqn: '',
      componentProps: {}
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditRoute = (route: any) => {
    setSelectedRoute({ ...route });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (confirm('Are you sure you want to delete this route?')) {
      try {
        // TODO: Implement delete mutation
        reactory.log('Delete route:', routeId);
      } catch (error) {
        reactory.log('Error deleting route:', error);
      }
    }
  };

  const handleSaveRoute = async () => {
    try {
      // TODO: Implement save/update mutation
      reactory.log(isEditing ? 'Update route:' : 'Create route:', selectedRoute);
      setDialogOpen(false);
      setSelectedRoute(null);
    } catch (error) {
      reactory.log('Error saving route:', error);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedRoute(null);
  };

  const handleFieldChange = (field: string, value: any) => {
    setSelectedRoute({ ...selectedRoute, [field]: value });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader
          avatar={<RouteIcon />}
          title="Application Routes"
          subheader={`Total: ${totalRoutes}`}
          action={
            mode === 'edit' && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={handleAddRoute}
              >
                Add Route
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {routes.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Path</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Component</TableCell>
                    <TableCell>Access</TableCell>
                    <TableCell>Roles</TableCell>
                    {mode === 'edit' && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routes.map((route: any) => (
                    <TableRow key={route.id || route.key}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontFamily="monospace">
                            {route.path}
                          </Typography>
                          {route.exact && (
                            <Chip label="exact" size="small" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{route.title}</TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {route.componentFqn}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {route.public ? (
                          <Chip
                            icon={<LockOpenIcon />}
                            label="Public"
                            size="small"
                            color="success"
                          />
                        ) : (
                          <Chip
                            icon={<LockIcon />}
                            label="Private"
                            size="small"
                            color="default"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {route.roles?.length > 0 ? (
                            route.roles.map((role: string) => (
                              <Chip key={role} label={role} size="small" />
                            ))
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No roles
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      {mode === 'edit' && (
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleEditRoute(route)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRoute(route.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No routes configured. Routes will be displayed here when available.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Route Edit/Create Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Route' : 'Add New Route'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Route Key"
              value={selectedRoute?.key || ''}
              onChange={(e) => handleFieldChange('key', e.target.value)}
              fullWidth
              helperText="Unique identifier for the route"
            />
            <TextField
              label="Path"
              value={selectedRoute?.path || ''}
              onChange={(e) => handleFieldChange('path', e.target.value)}
              fullWidth
              helperText="Route path (e.g., /dashboard or /users/:id)"
            />
            <TextField
              label="Title"
              value={selectedRoute?.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              fullWidth
              helperText="Display title for the route"
            />
            <TextField
              label="Component FQN"
              value={selectedRoute?.componentFqn || ''}
              onChange={(e) => handleFieldChange('componentFqn', e.target.value)}
              fullWidth
              helperText="Fully qualified component name (e.g., namespace.ComponentName@1.0.0)"
            />
            <TextField
              label="Roles"
              value={selectedRoute?.roles?.join(', ') || ''}
              onChange={(e) => handleFieldChange('roles', e.target.value.split(',').map((r: string) => r.trim()))}
              fullWidth
              helperText="Comma-separated list of required roles"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedRoute?.exact || false}
                    onChange={(e) => handleFieldChange('exact', e.target.checked)}
                  />
                }
                label="Exact Match"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={selectedRoute?.public || false}
                    onChange={(e) => handleFieldChange('public', e.target.checked)}
                  />
                }
                label="Public Route"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSaveRoute} variant="contained">
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationRoutesPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationRoutesPanel,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'routes', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationRoutesPanel,
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
    component: ApplicationRoutesPanel,
  });
}

