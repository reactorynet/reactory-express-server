'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationStatisticsPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

/**
 * ApplicationStatisticsPanel displays usage statistics and metrics for an application
 */
const ApplicationStatisticsPanel = (props: ApplicationStatisticsPanelProps) => {
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
    Box,
    Divider,
    Chip,
  } = Material.MaterialCore;

  const {
    TrendingUp: TrendingUpIcon,
    People: PeopleIcon,
    Schedule: ScheduleIcon,
    Timeline: TimelineIcon,
  } = Material.MaterialIcons;

  const statistics = formData || {};

  const StatCard = ({ icon, title, value, subtitle, color = 'primary' }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              mr: 2,
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.dark`,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4">{value || '0'}</Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const formatDuration = (minutes: number | undefined): string => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: string | undefined): string => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom>
            Application Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of application usage and activity metrics
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon />}
            title="Active Users"
            value={statistics.activeUsers || 0}
            subtitle="Currently active"
            color="primary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TimelineIcon />}
            title="Total Sessions"
            value={statistics.totalSessions || 0}
            subtitle="All time"
            color="secondary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ScheduleIcon />}
            title="Avg Session Duration"
            value={formatDuration(statistics.averageSessionDuration)}
            subtitle="Per session"
            color="success"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<TrendingUpIcon />} title="Last Activity" value={formatDate(statistics.lastActivity)} subtitle="" color="info" />
        </Grid>

        {/* Additional Statistics Card */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Usage Trends" />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`${statistics.activeUsers || 0} Active Users`} color="primary" variant="outlined" />
                <Chip label={`${statistics.totalSessions || 0} Total Sessions`} color="secondary" variant="outlined" />
                <Chip label={`${formatDuration(statistics.averageSessionDuration)} Avg Duration`} color="success" variant="outlined" />
              </Box>
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Last activity: {formatDate(statistics.lastActivity)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationStatisticsPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationStatisticsPanel,
  roles: ['USER'],
  tags: ['application', 'statistics', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationStatisticsPanel,
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
    component: ApplicationStatisticsPanel,
  });
}
