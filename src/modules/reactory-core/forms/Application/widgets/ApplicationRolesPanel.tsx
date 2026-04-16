'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationRolesPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const ApplicationRolesPanel = (props: ApplicationRolesPanelProps) => {
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
    Chip,
  } = Material.MaterialCore;

  const { AdminPanelSettings: RolesIcon } = Material.MaterialIcons;

  const roles: string[] = formData?.applicationRoles || [];
  const totalRoles = roles.length;

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader avatar={<RolesIcon />} title="Application Roles" subheader={`Total: ${totalRoles}`} />
        <Divider />
        <CardContent>
          {roles.length > 0 ? (
            <List>
              {roles.map((role: string) => (
                <ListItem key={role}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={role} color="primary" />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No roles found. Role data will be populated here when available.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationRolesPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationRolesPanel,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'roles', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationRolesPanel,
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
    component: ApplicationRolesPanel,
  });
}
