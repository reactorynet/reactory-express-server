'use strict';

interface OrganizationTeamsTabDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface OrganizationTeamsTabProps {
  reactory: Reactory.Client.IReactoryApi;
  organization: any;
  refreshKey?: number;
  onRefresh?: () => void;
}

/**
 * OrganizationTeamsTab Component
 *
 * Displays and manages teams within an organization.
 * Features:
 * - List of teams with member counts
 * - Create new team
 * - View members of each team
 * - Expand/collapse team details
 * - Delete team capability
 */
const OrganizationTeamsTab = (props: OrganizationTeamsTabProps) => {
  const { reactory, organization, onRefresh } = props;

  const { React, Material } = reactory.getComponents<OrganizationTeamsTabDependencies>([
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
    Groups: GroupsIcon,
    People: PeopleIcon,
    Delete: DeleteIcon,
  } = Material.MaterialIcons;

  const [teams, setTeams] = useState<any[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch teams from server
  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = `query teamsForOrganization($id: String!) {
        teamsForOrganization(id: $id) {
          id
          name
          title
          description
          avatar
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
          createdAt
        }
      }`;
      const result = await reactory.graphqlQuery(query, { id: organization.id });
      if (result?.data?.teamsForOrganization) {
        setTeams(result.data.teamsForOrganization.filter(Boolean));
      }
    } catch (error: any) {
      reactory.createNotification(
        `Failed to load teams: ${error.message || 'Unknown error'}`,
        { showInAppNotification: true, type: 'error' }
      );
    } finally {
      setIsLoading(false);
    }
  }, [organization.id, reactory]);

  useEffect(() => {
    fetchTeams();
  }, [props.refreshKey]);

  const handleToggleTeam = useCallback((teamId: string) => {
    setExpandedTeam((prev: string | null) => prev === teamId ? null : teamId);
  }, []);

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim()) {
      reactory.createNotification('Team name is required', { showInAppNotification: true, type: 'warning' });
      return;
    }

    setIsCreating(true);
    try {
      const mutation = `mutation createTeam($input: TeamInput) {
        createTeam(input: $input) {
          id
          name
          description
        }
      }`;

      await reactory.graphqlMutation(mutation, {
        input: {
          name: newTeamName.trim(),
          description: newTeamDescription.trim(),
          organization: organization.id,
        }
      });

      reactory.createNotification(`Team "${newTeamName}" created successfully`, { showInAppNotification: true, type: 'success' });
      setCreateDialogOpen(false);
      setNewTeamName('');
      setNewTeamDescription('');
      await fetchTeams();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      reactory.createNotification(
        `Failed to create team: ${error.message || 'Unknown error'}`,
        { showInAppNotification: true, type: 'error' }
      );
    } finally {
      setIsCreating(false);
    }
  }, [newTeamName, newTeamDescription, organization.id, reactory, fetchTeams, onRefresh]);

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    try {
      const mutation = `mutation deleteTeam($id: String!) {
        deleteTeam(id: $id)
      }`;

      await reactory.graphqlMutation(mutation, { id: teamId });
      reactory.createNotification('Team deleted successfully', { showInAppNotification: true, type: 'success' });
      setDeleteConfirmId(null);
      await fetchTeams();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      reactory.createNotification(
        `Failed to delete team: ${error.message || 'Unknown error'}`,
        { showInAppNotification: true, type: 'error' }
      );
    }
  }, [reactory, fetchTeams, onRefresh]);

  return (
    <Box sx={{ p: 2 }}>
      <Card variant="outlined">
        <CardHeader
          avatar={<GroupsIcon color="primary" />}
          title="Teams"
          subheader={`${teams.length} team${teams.length !== 1 ? 's' : ''}`}
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add Team
            </Button>
          }
        />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Loading teams...</Typography>
            </Box>
          ) : teams.length > 0 ? (
            <List disablePadding>
              {teams.map((team: any) => (
                <Box key={team.id}>
                  <ListItem
                    button
                    onClick={() => handleToggleTeam(team.id)}
                    sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                  >
                    <ListItemAvatar>
                      <Avatar src={team.avatar} sx={{ bgcolor: 'secondary.light' }}>
                        <GroupsIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={team.name || team.title}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          {team.description && (
                            <Typography variant="caption" color="text.secondary">
                              {team.description}
                            </Typography>
                          )}
                          <Chip
                            icon={<PeopleIcon style={{ fontSize: 14 }} />}
                            label={`${team.members?.length || 0} members`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Delete Team">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e: any) => { e.stopPropagation(); setDeleteConfirmId(team.id); }}
                          sx={{ mr: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton edge="end" onClick={() => handleToggleTeam(team.id)} size="small">
                        {expandedTeam === team.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {/* Expanded member list */}
                  <Collapse in={expandedTeam === team.id} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 9, pr: 2, pb: 2 }}>
                      {team.owner && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Owner
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                              {team.owner.firstName?.[0]}{team.owner.lastName?.[0]}
                            </Avatar>
                            <Typography variant="body2">
                              {team.owner.firstName} {team.owner.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {team.owner.email}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Members ({team.members?.length || 0})
                      </Typography>
                      {team.members && team.members.length > 0 ? (
                        <List dense disablePadding>
                          {team.members.map((member: any) => (
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
                      {team.createdAt && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                          Created: {new Date(team.createdAt).toLocaleDateString()}
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
              <GroupsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No teams defined for this organization.
              </Typography>
              <Button
                variant="text"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ mt: 1 }}
              >
                Create First Team
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Team Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupsIcon />
            Create Team
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Team Name"
              value={newTeamName}
              onChange={(e: any) => setNewTeamName(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Enter team name"
            />
            <TextField
              label="Description"
              value={newTeamDescription}
              onChange={(e: any) => setNewTeamDescription(e.target.value)}
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
            onClick={handleCreateTeam}
            variant="contained"
            disabled={isCreating || !newTeamName.trim()}
            startIcon={<AddIcon />}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Team?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete this team? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            onClick={() => deleteConfirmId && handleDeleteTeam(deleteConfirmId)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const Definition = {
  name: 'OrganizationTeamsTab',
  nameSpace: 'core',
  version: '1.0.0',
  component: OrganizationTeamsTab,
  roles: ['USER', 'ADMIN']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    OrganizationTeamsTab,
    ['Organization'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: OrganizationTeamsTab
  });
}
