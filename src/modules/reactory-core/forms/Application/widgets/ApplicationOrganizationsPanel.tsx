'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationOrganizationsPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const ApplicationOrganizationsPanel = (props: ApplicationOrganizationsPanelProps) => {
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
    Chip,
  } = Material.MaterialCore;

  const { Business: BusinessIcon } = Material.MaterialIcons;

  const organizations = formData?.organizations || [];
  const totalOrganisations = formData?.totalOrganisations || 0;

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader avatar={<BusinessIcon />} title="Organizations" subheader={`Total: ${totalOrganisations}`} />
        <Divider />
        <CardContent>
          {organizations.length > 0 ? (
            <List>
              {organizations.map((org: any) => (
                <ListItem key={org.id}>
                  <ListItemAvatar>
                    <Avatar src={org.avatar} alt={org.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={org.name}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip label={org.slug} size="small" />
                        <Typography variant="caption">Created: {new Date(org.createdAt).toLocaleDateString()}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No organizations found. Organization data will be populated here when available.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationOrganizationsPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationOrganizationsPanel,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'organizations', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationOrganizationsPanel,
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
    component: ApplicationOrganizationsPanel,
  });
}
