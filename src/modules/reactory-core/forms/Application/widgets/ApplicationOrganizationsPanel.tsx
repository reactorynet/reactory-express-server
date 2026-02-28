'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  ApplicationOrganizations: Reactory.Client.AnyValidComponent;
}

interface ApplicationOrganizationsPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const ApplicationOrganizationsPanel = (props: ApplicationOrganizationsPanelProps) => {
  const { reactory, formData, applicationId, mode = 'view' } = props;

  const { React, Material, ApplicationOrganizations } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
    'core.ApplicationOrganizations@1.0.0',
  ]);

  const { Box } = Material.MaterialCore;

  // If no application ID is available, show a message
  if (!applicationId) {
    const { Typography, Card, CardContent } = Material.MaterialCore;
    const { Warning: WarningIcon } = Material.MaterialIcons;

    return (
      <Box sx={{ p: 2 }}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon color="warning" />
            <Typography variant="body2" color="text.secondary">
              No application ID provided. Please provide an applicationId to view organizations.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Render the ApplicationOrganizations form component
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ApplicationOrganizations
        applicationId={applicationId}
        mode={mode}
      />
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
