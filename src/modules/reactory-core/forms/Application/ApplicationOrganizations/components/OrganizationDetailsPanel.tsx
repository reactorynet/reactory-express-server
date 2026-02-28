'use strict';

interface OrganizationDetailsPanelDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  OrganizationOverviewTab: any;
  OrganizationBusinessUnitsTab: any;
  OrganizationTeamsTab: any;
}

interface OrganizationDetailsPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  organization: any;
  useCase?: 'grid' | 'standalone';
  rowData?: any;
}

/**
 * OrganizationDetailsPanel Component
 *
 * Comprehensive detail panel for an organization with a tabbed interface.
 * Displays organization header info and provides tabs for:
 * - Overview: General organization details and edit capabilities
 * - Business Units: Manage business units within the organization
 * - Teams: Manage teams within the organization
 *
 * Used as a detail panel in the MaterialTable via componentMap.
 *
 * @example
 * {
 *   componentMap: {
 *     DetailsPanel: "core.OrganizationDetailsPanel@1.0.0"
 *   }
 * }
 */
const OrganizationDetailsPanel = (props: OrganizationDetailsPanelProps) => {
  const { reactory, organization, useCase = 'grid', rowData } = props;

  const org = organization || rowData;

  if (!org) {
    return <div>No organization data available</div>;
  }

  const {
    React,
    Material,
    OrganizationOverviewTab,
    OrganizationBusinessUnitsTab,
    OrganizationTeamsTab,
  } = reactory.getComponents<OrganizationDetailsPanelDependencies>([
    'react.React',
    'material-ui.Material',
    'core.OrganizationOverviewTab@1.0.0',
    'core.OrganizationBusinessUnitsTab@1.0.0',
    'core.OrganizationTeamsTab@1.0.0',
  ]);

  const { MaterialCore, MaterialIcons } = Material;
  const {
    Box,
    Tabs,
    Tab,
    Typography,
    Icon,
    Badge,
    Chip,
    Avatar,
  } = MaterialCore;

  const {
    Business: BusinessIcon,
  } = MaterialIcons;

  const [activeTab, setActiveTab] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleTabChange = (_event: any, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    setRefreshKey((prev: number) => prev + 1);
  };

  // Calculate summary stats
  const businessUnitCount = org.businessUnits?.length || 0;

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'info',
      badge: 0,
      component: OrganizationOverviewTab,
    },
    {
      id: 'business-units',
      label: 'Business Units',
      icon: 'account_tree',
      badge: businessUnitCount,
      component: OrganizationBusinessUnitsTab,
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: 'groups',
      badge: 0,
      component: OrganizationTeamsTab,
    },
  ];

  const ActiveTabComponent = tabs[activeTab]?.component;

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {/* Header Section */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Organization Avatar */}
          <Avatar
            src={org.avatarURL || org.logoURL}
            alt={org.name}
            sx={{ width: 40, height: 40 }}
          >
            {!org.avatarURL && !org.logoURL && <BusinessIcon />}
          </Avatar>

          {/* Organization Name */}
          <Typography
            variant="h6"
            sx={{ fontWeight: 600 }}
          >
            {org.name}
          </Typography>

          {/* Code Badge */}
          {org.code && (
            <Chip
              label={org.code}
              size="small"
              icon={<Icon>tag</Icon>}
              color="primary"
              variant="outlined"
              sx={{ fontFamily: 'monospace' }}
            />
          )}

          {/* Trading Name */}
          {org.tradingName && (
            <Chip
              label={org.tradingName}
              size="small"
              variant="outlined"
              sx={{ color: '#666' }}
            />
          )}
        </Box>
      </Box>

      {/* Summary Bar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          gap: 3,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>account_tree</Icon>
          <Typography variant="body2" color="text.secondary">
            <strong>{businessUnitCount}</strong> business unit{businessUnitCount !== 1 ? 's' : ''}
          </Typography>
        </Box>
        {org.createdAt && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>calendar_today</Icon>
            <Typography variant="body2" color="text.secondary">
              Created {new Date(org.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        )}
        {org.updatedAt && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>update</Icon>
            <Typography variant="body2" color="text.secondary">
              Updated {new Date(org.updatedAt).toLocaleDateString()}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Tabs Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              icon={
                tab.badge && tab.badge > 0 ? (
                  <Badge
                    badgeContent={tab.badge}
                    color="primary"
                  >
                    <Icon>{tab.icon}</Icon>
                  </Badge>
                ) : (
                  <Icon>{tab.icon}</Icon>
                )
              }
              label={tab.label}
              iconPosition="start"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                fontSize: '0.875rem'
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ p: 0 }}>
        {ActiveTabComponent && (
          <ActiveTabComponent
            organization={org}
            reactory={reactory}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        )}
      </Box>
    </Box>
  );
};

const Definition = {
  name: 'OrganizationDetailsPanel',
  nameSpace: 'core',
  version: '1.0.0',
  component: OrganizationDetailsPanel,
  roles: ['USER', 'ADMIN']
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    OrganizationDetailsPanel,
    ['Organization'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: OrganizationDetailsPanel
  });
}
