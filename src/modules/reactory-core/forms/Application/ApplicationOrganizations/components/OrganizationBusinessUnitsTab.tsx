'use strict';

interface OrganizationBusinessUnitsTabDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface OrganizationBusinessUnitsTabProps {
  reactory: Reactory.Client.IReactoryApi;
  organization: any;
  refreshKey?: number;
  onRefresh?: () => void;
}

/**
 * OrganizationBusinessUnitsTab Component
 *
 * Displays and manages business units within an organization.
 * Features:
 * - List of business units with member counts
 * - Create new business unit
 * - View members of each business unit
 * - Expand/collapse business unit details
 */
const OrganizationBusinessUnitsTab = (props: OrganizationBusinessUnitsTabProps) => {
  const { reactory, organization, onRefresh } = props;

  const { React, Material } = reactory.getComponents<OrganizationBusinessUnitsTabDependencies>([
    'react.React',
    'material-ui.Material',
  ]);

  const { useState, useCallback, useEffect } = React;

  const {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    CardHeader,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemSecondaryAction,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    Collapse,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
  } = Material.MaterialCore;

  const {
    Add: AddIcon,
    ExpandMore: ExpandMoreIcon,
    ExpandLess: ExpandLessIcon,
    AccountTree: AccountTreeIcon,
    People: PeopleIcon,
    Delete: DeleteIcon,
  } = Material.MaterialIcons;

  const [businessUnits, setBusinessUnits] = useState(organization.businessUnits || []);
  const [expandedBU, setExpandedBU] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBUName, setNewBUName] = useState('');
  const [newBUDescription, setNewBUDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch business units from server
  const fetchBusinessUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = `query businessUnitsForOrganization($id: String!) {
        businessUnitsForOrganization(id: $id) {
          id
          name
          description
          owner {
            id
            firstName
            lastName
            email
          }
          members {
            id
            firstName
            lastName
            email
            avatar
          }
        }
      }`;
      const result = await reactory.graphqlQuery(query, { id: organization.id });
      if (result?.data?.businessUnitsForOrganization) {
        setBusinessUnits(result.data.businessUnitsForOrganization);
      }
    } catch (error: any) {
      reactory.createNotification(
        `Failed to load business units: ${error.message || 'Unknown error'}`,
        { showInAppNotification: true, type: 'error' }
      );
    } finally {
      setIsLoading(false);
    }
  }, [organization.id, reactory]);

  useEffect(() => {
    fetchBusinessUnits();
  }, [props.refreshKey]);

  const handleToggleBU = useCallback((buId: string) => {
    setExpandedBU((prev: string | null) => prev === buId ? null : buId);
  }, []);

  const handleCreateBusinessUnit = useCallback(async () => {
    if (!newBUName.trim()) {
      reactory.createNotification('Business unit name is required', { showInAppNotification: true, type: 'warning' });
      return;
    }

    setIsCreating(true);
    try {
      const mutation = `mutation createBusinessUnit($input: BusinessUnitInput!) {
        createBusinessUnit(input: $input) {
          id
          name
          description
        }
      }`;

      await reactory.graphqlMutation(mutation, {
        input: {
          name: newBUName.trim(),
          description: newBUDescription.trim(),
          organization: organization.id,
          owner: reactory.getUser()?.id,
        }
      });

      reactory.createNotification(`Business unit "${newBUName}" created successfully`, { showInAppNotification: true, type: 'success' });
      setCreateDialogOpen(false);
      setNewBUName('');
      setNewBUDescription('');
      await fetchBusinessUnits();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      reactory.createNotification(
        `Failed to create business unit: ${error.message || 'Unknown error'}`,
        { showInAppNotification: true, type: 'error' }
      );
    } finally {
      setIsCreating(false);
    }
  }, [newBUName, newBUDescription, organization.id, reactory, fetchBusinessUnits, onRefresh]);

  return (
    <Box sx={{ p: 2 }}>
      <Card variant="outlined">
        <CardHeader
          avatar={<AccountTreeIcon color="primary" />}
          title="Business Units"
          subheader={`${businessUnits.length} business unit${businessUnits.length !== 1 ? 's' : ''}`}
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add Business Unit
            </Button>
          }
        />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Loading business units...</Typography>
            </Box>
          ) : businessUnits.length > 0 ? (
            <List disablePadding>
              {businessUnits.map((bu: any) => (
                <Box key={bu.id}>
                  <ListItem
                    button
                    onClick={() => handleToggleBU(bu.id)}
                    sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        <AccountTreeIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={bu.name}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          {bu.description && (
                            <Typography variant="caption" color="text.secondary">
                              {bu.description}
                            </Typography>
                          )}
                          <Chip
                            icon={<PeopleIcon style={{ fontSize: 14 }} />}
                            label={`${bu.members?.length || 0} members`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleToggleBU(bu.id)} size="small">
                        {expandedBU === bu.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {/* Expanded member list */}
                  <Collapse in={expandedBU === bu.id} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 9, pr: 2, pb: 2 }}>
                      {bu.owner && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Owner
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                              {bu.owner.firstName?.[0]}{bu.owner.lastName?.[0]}
                            </Avatar>
                            <Typography variant="body2">
                              {bu.owner.firstName} {bu.owner.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {bu.owner.email}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Members ({bu.members?.length || 0})
                      </Typography>
                      {bu.members && bu.members.length > 0 ? (
                        <List dense disablePadding>
                          {bu.members.map((member: any) => (
                            <ListItem key={member.id} disablePadding sx={{ py: 0.5 }}>
                              <ListItemAvatar sx={{ minWidth: 36 }}>
                                <Avatar src={member.avatar} sx={{ width: 24, height: 24, fontSize: 12 }}>
                                  {member.firstName?.[0]}{member.lastName?.[0]}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={`${member.firstName} ${member.lastName}`}
                                secondary={member.email}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          No members assigned
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                  <Divider />
                </Box>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <AccountTreeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No business units defined for this organization.
              </Typography>
              <Button
                variant="text"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ mt: 1 }}
              >
                Create First Business Unit
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Business Unit Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountTreeIcon />
            Create Business Unit
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Business Unit Name"
              value={newBUName}
              onChange={(e: any) => setNewBUName(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Enter business unit name"
            />
            <TextField
              label="Description"
              value={newBUDescription}
              onChange={(e: any) => setNewBUDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Enter a description (optional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateBusinessUnit}
            variant="contained"
            disabled={isCreating || !newBUName.trim()}
            startIcon={<AddIcon />}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Definition = {
  name: 'OrganizationBusinessUnitsTab',
  nameSpace: 'core',
  version: '1.0.0',
  component: OrganizationBusinessUnitsTab,
  roles: ['USER', 'ADMIN']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    OrganizationBusinessUnitsTab,
    ['Organization'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: OrganizationBusinessUnitsTab
  });
}
