'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationOverviewPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

/**
 * ApplicationOverviewPanel displays the overview information for an application
 * including name, description, URLs, email settings, and other basic information.
 */
const ApplicationOverviewPanel = (props: ApplicationOverviewPanelProps) => {
  const { reactory, formData, applicationId, mode = 'view' } = props;

  const { React, Material } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
  ]);

  const {
    Card,
    CardContent,
    CardHeader,
    Grid,
    Typography,
    Avatar,
    Chip,
    Box,
    Divider,
    Link,
  } = Material.MaterialCore;

  const {
    Language: LanguageIcon,
    CalendarToday: CalendarIcon,
    Email: EmailIcon,
    VpnKey: KeyIcon,
  } = Material.MaterialIcons;

  const { i18n } = reactory;

  const overview = formData || {};

  const InfoItem = ({ icon, label, value }: { icon: any; label: string; value: string | undefined }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box sx={{ mr: 2, color: 'action.active' }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2">{value || 'Not set'}</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {/* Header Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar src={overview.avatar} alt={overview.name} sx={{ width: 80, height: 80, mr: 3 }} />
                <Box>
                  <Typography variant="h4" gutterBottom>
                    {i18n.t(overview.name, { defaultValue: 'Not set' })}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {overview.description || 'No description provided'}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip label={`Version ${overview.version || '1.0.0'}`} size="small" sx={{ mr: 1 }} />
                    <Chip label={`Key: ${overview.key || 'N/A'}`} size="small" variant="outlined" />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Application Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Application Details" />
            <Divider />
            <CardContent>
              <InfoItem icon={<LanguageIcon />} label="Site URL" value={overview.siteUrl} />
              {overview.siteUrl && (
                <Link href={overview.siteUrl} target="_blank" rel="noopener noreferrer" sx={{ mb: 2, display: 'block' }}>
                  Visit Application
                </Link>
              )}

              <InfoItem icon={<KeyIcon />} label="Application ID" value={overview.id} />

              <InfoItem
                icon={<CalendarIcon />}
                label="Created At"
                value={overview.createdAt ? new Date(overview.createdAt).toLocaleDateString() : undefined}
              />

              <InfoItem
                icon={<CalendarIcon />}
                label="Updated At"
                value={overview.updatedAt ? new Date(overview.updatedAt).toLocaleDateString() : undefined}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Email & Authentication */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Email & Authentication" />
            <Divider />
            <CardContent>
              <InfoItem icon={<EmailIcon />} label="Username" value={overview.username} />

              <InfoItem icon={<EmailIcon />} label="Email" value={overview.email} />              
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Active Theme
                </Typography>
                <Typography variant="body2">{overview.theme || 'Default'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationOverviewPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationOverviewPanel,
  roles: ['USER'],
  tags: ['application', 'overview', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationOverviewPanel,
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
    component: ApplicationOverviewPanel,
  });
}
