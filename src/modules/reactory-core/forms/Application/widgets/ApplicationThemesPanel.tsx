'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationThemesPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const ApplicationThemesPanel = (props: ApplicationThemesPanelProps) => {
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
    Grid,
    Paper,
    Chip,
  } = Material.MaterialCore;

  const { Palette: PaletteIcon } = Material.MaterialIcons;

  const themes = formData?.themes || [];
  const activeTheme = formData?.activeTheme;

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader avatar={<PaletteIcon />} title="Application Themes" subheader={`Active: ${activeTheme || 'Default'}`} />
        <Divider />
        <CardContent>
          {themes.length > 0 ? (
            <Grid container spacing={2}>
              {themes.map((theme: any) => (
                <Grid item xs={12} sm={6} md={4} key={theme.id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      border: theme.name === activeTheme ? 2 : 1,
                      borderColor: theme.name === activeTheme ? 'primary.main' : 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{theme.name}</Typography>
                      {theme.name === activeTheme && <Chip label="Active" color="primary" size="small" />}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={theme.mode || 'light'} size="small" variant="outlined" />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: theme.primaryColor || '#1976d2',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: theme.secondaryColor || '#dc004e',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                    </Box>

                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Primary • Secondary
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No themes configured. Theme data will be populated here when available.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationThemesPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationThemesPanel,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'themes', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationThemesPanel,
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
    component: ApplicationThemesPanel,
  });
}
