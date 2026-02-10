'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  ApplicationUsers: Reactory.Client.AnyValidComponent;
}

interface ApplicationUsersPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: Partial<Reactory.Models.IReactoryClient>;
  mode?: 'view' | 'edit';
  applicationId?: string;
}

const ApplicationUsersPanel = (props: ApplicationUsersPanelProps) => {
  const { reactory, formData, mode = 'view', applicationId } = props;

  const { React, Material, ApplicationUsers } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
    'core.ApplicationUsers@1.0.0',
  ]);

  const { Box } = Material.MaterialCore;
  
  // If no client ID is available, show a message
  if (!applicationId) {
    const { Typography, Card, CardContent } = Material.MaterialCore;
    const { Warning: WarningIcon } = Material.MaterialIcons;
    
    return (
      <Box sx={{ p: 2 }}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon color="warning" />
            <Typography variant="body2" color="text.secondary">
              No application ID provided. Please provide an applicationId to view users.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Render the ApplicationUsers form component
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ApplicationUsers
        applicationId={applicationId}        
        mode={mode}        
      />
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
