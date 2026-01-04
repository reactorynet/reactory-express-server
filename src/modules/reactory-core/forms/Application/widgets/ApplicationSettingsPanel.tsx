'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationSettingsPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

/**
 * ApplicationSettingsPanel displays application settings and configuration
 */
const ApplicationSettingsPanel = (props: ApplicationSettingsPanelProps) => {
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
    Paper,
  } = Material.MaterialCore;

  const { Settings: SettingsIcon } = Material.MaterialIcons;

  const settings = formData?.settings || {};
  const menus = formData?.menus || [];

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader avatar={<SettingsIcon />} title="Application Settings" />
        <Divider />
        <CardContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Application configuration and settings will be displayed here. This panel can be extended to show specific configuration
            options based on your application's needs.
          </Typography>

          {Object.keys(settings).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Current Settings
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <pre style={{ margin: 0, overflow: 'auto' }}>{JSON.stringify(settings, null, 2)}</pre>
              </Paper>
            </Box>
          )}

          {menus.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Configured Menus
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <pre style={{ margin: 0, overflow: 'auto' }}>{JSON.stringify(menus, null, 2)}</pre>
              </Paper>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationSettingsPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationSettingsPanel,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'settings', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationSettingsPanel,
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
    component: ApplicationSettingsPanel,
  });
}
