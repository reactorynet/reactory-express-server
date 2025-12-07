'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationUsersPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const ApplicationUsersPanel = (props: ApplicationUsersPanelProps) => {
  const { reactory, formData, applicationId, mode = 'view' } = props;

  const { React, Material } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
  ]);

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
    ListItemAvatar,
    Avatar,
  } = Material.MaterialCore;

  const {
    People: PeopleIcon,
    Email: EmailIcon,
  } = Material.MaterialIcons;

  const users = formData?.users || [];
  const totalUsers = formData?.totalUsers || 0;

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader avatar={<PeopleIcon />} title="Application Users" subheader={`Total: ${totalUsers}`} />
        <Divider />
        <CardContent>
          {users.length > 0 ? (
            <List>
              {users.map((user: any) => (
                <ListItem key={user.id}>
                  <ListItemAvatar>
                    <Avatar src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <EmailIcon fontSize="small" />
                        <Typography variant="caption">{user.email}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No users found. User data will be populated here when available.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationUsersPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationUsersPanel,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'users', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationUsersPanel,
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
    component: ApplicationUsersPanel,
  });
}
