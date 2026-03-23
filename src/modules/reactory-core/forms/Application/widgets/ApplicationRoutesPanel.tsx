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

const ROUTE_FIELDS = `
  id
  key
  path
  title
  exact
  public
  roles
  componentFqn
  componentProps
`;

const MUTATIONS = {
  addRoute: `mutation ReactoryClientAddRoute($clientId: String!, $route: ClientRouteInput!) {
    ReactoryClientAddRoute(clientId: $clientId, route: $route) {
      id
      routes { ${ROUTE_FIELDS} }
    }
  }`,
  updateRoute: `mutation ReactoryClientUpdateRoute($clientId: String!, $routeId: String!, $route: ClientRouteInput!) {
    ReactoryClientUpdateRoute(clientId: $clientId, routeId: $routeId, route: $route) {
      id
      routes { ${ROUTE_FIELDS} }
    }
  }`,
  deleteRoute: `mutation ReactoryClientDeleteRoute($clientId: String!, $routeId: String!) {
    ReactoryClientDeleteRoute(clientId: $clientId, routeId: $routeId) {
      id
      routes { ${ROUTE_FIELDS} }
    }
  }`,
  reorderRoutes: `mutation ReactoryClientReorderRoutes($clientId: String!, $routeIds: [String!]!) {
    ReactoryClientReorderRoutes(clientId: $clientId, routeIds: $routeIds) {
      id
      routes { ${ROUTE_FIELDS} }
    }
  }`,
};

const ApplicationRoutesPanel = (props: ApplicationRoutesPanelProps) => {
  const { reactory, formData, applicationId, mode = 'view' } = props;

  const { React, Material } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
  ]);

  const { useState } = React;

  const {
    Alert,
    Card,
    CardContent,
    CardHeader,
    Box,
    Typography,
    Divider,
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
    CircularProgress,
    Tooltip,
  } = Material.MaterialCore;

  const {
    Route: RouteIcon,
    Add: AddIcon,
    Edit: EditIcon,
    Delete: DeleteIcon,
    Lock: LockIcon,
    LockOpen: LockOpenIcon,
    ArrowUpward: ArrowUpwardIcon,
    ArrowDownward: ArrowDownwardIcon,
  } = Material.MaterialIcons;

  const isAdmin = reactory.hasRole(['ADMIN']);

  const [routes, setRoutes] = useState<any[]>(formData?.routes || []);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (formData?.routes) {
      setRoutes(formData.routes);
    }
  }, [formData?.routes]);

  const totalRoutes = formData?.totalRoutes || routes.length;

  const updateRoutesFromResult = (result: any, mutationKey: string) => {
    const data = result?.data?.[mutationKey];
    if (data?.routes) {
      setRoutes(data.routes);
    }
  };

  const handleAddRoute = () => {
    setSelectedRoute({
      key: '',
      path: '',
      title: '',
      exact: true,
      public: false,
      roles: [],
      componentFqn: '',
      componentProps: {},
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
    if (!applicationId || !routeId) return;
    if (!confirm('Are you sure you want to delete this route?')) return;
    setLoading(true);
    try {
      const result = await reactory.graphqlMutation(MUTATIONS.deleteRoute, {
        clientId: applicationId,
        routeId,
      });
      updateRoutesFromResult(result, 'ReactoryClientDeleteRoute');
    } catch (error) {
      reactory.createNotification('Error deleting route', { type: 'error' });
      reactory.log('Error deleting route:', error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const routeInput = {
        key: selectedRoute.key,
        path: selectedRoute.path,
        title: selectedRoute.title,
        exact: selectedRoute.exact,
        public: selectedRoute.public,
        roles: selectedRoute.roles,
        componentFqn: selectedRoute.componentFqn,
        componentProps: selectedRoute.componentProps,
      };

      if (isEditing && selectedRoute.id) {
        const result = await reactory.graphqlMutation(MUTATIONS.updateRoute, {
          clientId: applicationId,
          routeId: selectedRoute.id,
          route: routeInput,
        });
        updateRoutesFromResult(result, 'ReactoryClientUpdateRoute');
      } else {
        const result = await reactory.graphqlMutation(MUTATIONS.addRoute, {
          clientId: applicationId,
          route: routeInput,
        });
        updateRoutesFromResult(result, 'ReactoryClientAddRoute');
      }

      setDialogOpen(false);
      setSelectedRoute(null);
    } catch (error) {
      reactory.createNotification('Error saving route', { type: 'error' });
      reactory.log('Error saving route:', error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveRoute = async (index: number, direction: 'up' | 'down') => {
    if (!applicationId) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= routes.length) return;

    const reordered = [...routes];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const routeIds = reordered.map((r: any) => r.id);

    setRoutes(reordered);
    setLoading(true);
    try {
      const result = await reactory.graphqlMutation(MUTATIONS.reorderRoutes, {
        clientId: applicationId,
        routeIds,
      });
      updateRoutesFromResult(result, 'ReactoryClientReorderRoutes');
    } catch (error) {
      setRoutes(routes);
      reactory.createNotification('Error reordering routes', { type: 'error' });
      reactory.log('Error reordering routes:', error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = async (route: any) => {
    if (!applicationId || !isAdmin) return;
    setLoading(true);
    try {
      const result = await reactory.graphqlMutation(MUTATIONS.updateRoute, {
        clientId: applicationId,
        routeId: route.id,
        route: { public: !route.public },
      });
      updateRoutesFromResult(result, 'ReactoryClientUpdateRoute');
    } catch (error) {
      reactory.createNotification('Error updating route access', { type: 'error' });
      reactory.log('Error toggling route access:', error, 'error');
    } finally {
      setLoading(false);
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
          avatar={loading ? <CircularProgress size={24} /> : <RouteIcon />}
          title="Application Routes"
          subheader={`Total: ${totalRoutes}`}
          action={
            isAdmin && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={handleAddRoute}
                disabled={loading}
              >
                Add Route
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {!isAdmin && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Only administrators can manage routes.
            </Alert>
          )}
          {routes.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {isAdmin && <TableCell width={80}>Order</TableCell>}
                    <TableCell>Path</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Component</TableCell>
                    <TableCell>Access</TableCell>
                    <TableCell>Roles</TableCell>
                    {isAdmin && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routes.map((route: any, index: number) => (
                    <TableRow key={route.id || route.key}>
                      {isAdmin && (
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Tooltip title="Move up">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveRoute(index, 'up')}
                                  disabled={index === 0 || loading}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Move down">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveRoute(index, 'down')}
                                  disabled={index === routes.length - 1 || loading}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      )}
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
                        {isAdmin ? (
                          <Tooltip title="Click to toggle access">
                            <Chip
                              icon={route.public ? <LockOpenIcon /> : <LockIcon />}
                              label={route.public ? 'Public' : 'Private'}
                              size="small"
                              color={route.public ? 'success' : 'default'}
                              onClick={() => handleToggleAccess(route)}
                              disabled={loading}
                              sx={{ cursor: 'pointer' }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip
                            icon={route.public ? <LockOpenIcon /> : <LockIcon />}
                            label={route.public ? 'Public' : 'Private'}
                            size="small"
                            color={route.public ? 'success' : 'default'}
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
                      {isAdmin && (
                        <TableCell align="right">
                          <Tooltip title="Edit route">
                            <IconButton
                              size="small"
                              onClick={() => handleEditRoute(route)}
                              disabled={loading}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete route">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRoute(route.id)}
                              disabled={loading}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
              onChange={(e) =>
                handleFieldChange(
                  'roles',
                  e.target.value
                    .split(',')
                    .map((r: string) => r.trim())
                    .filter(Boolean)
                )
              }
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
          <Button onClick={handleDialogClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSaveRoute} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : isEditing ? 'Update' : 'Create'}
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
