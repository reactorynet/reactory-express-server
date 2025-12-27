import Reactory from '@reactory/reactory-core';

interface DetailPanelDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  StatusBadge: any,
  UserAvatar: any,
  RelativeTime: any,
  CountBadge: any,
  SupportTicketOverview: any,
}

interface DetailPanelProps {
  reactory: Reactory.Client.IReactoryApi,
  ticket: Reactory.Models.IReactorySupportTicket,
  useCase?: string,
  rowData?: any,
}

/**
 * SupportTicketDetailPanel Component
 * 
 * Enhanced detail panel with tabbed interface for comprehensive ticket information display.
 * 
 * Features:
 * - Header with ticket reference, status, priority
 * - Tabbed interface (Overview, Comments, Attachments, Activity, Related)
 * - Action buttons for quick operations
 * - Integration with new generic widgets
 * 
 * @example
 * // In MaterialTable detailPanel configuration
 * {
 *   componentMap: {
 *     DetailsPanel: "core.SupportTicketDetailPanel@1.0.0"
 *   }
 * }
 */
const SupportTicketDetailPanel = (props: DetailPanelProps) => {
  const { reactory, ticket, useCase = 'grid', rowData } = props;
  
  if (!ticket) {
    return <div>No ticket data available</div>;
  }

  const { 
    React, 
    Material,
    StatusBadge,
    UserAvatar,
    RelativeTime,
    CountBadge,
    SupportTicketOverview,
  } = reactory.getComponents<DetailPanelDependencies>([
    'react.React',
    'material-ui.Material',
    'core.StatusBadge',
    'core.UserAvatar',
    'core.RelativeTime',
    'core.CountBadge',
    'core.SupportTicketOverview',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Tabs, 
    Tab, 
    Typography, 
    IconButton, 
    Icon, 
    Badge,
    Divider,
    Tooltip
  } = MaterialCore;

  const [activeTab, setActiveTab] = React.useState(0);

  const handleTabChange = (event: any, newValue: number) => {
    setActiveTab(newValue);
  };

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'info',
      component: SupportTicketOverview,
    },
    {
      id: 'comments',
      label: 'Comments',
      icon: 'comment',
      badge: ticket.comments?.length || 0,
      component: () => <Box p={3}><Typography>Comments tab - Coming in Phase 3</Typography></Box>,
    },
    {
      id: 'attachments',
      label: 'Attachments',
      icon: 'attach_file',
      badge: ticket.documents?.length || 0,
      component: () => <Box p={3}><Typography>Attachments tab - Coming in Phase 3</Typography></Box>,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: 'timeline',
      component: () => <Box p={3}><Typography>Activity tab - Coming in Phase 3</Typography></Box>,
    },
    {
      id: 'related',
      label: 'Related',
      icon: 'link',
      badge: ticket.relatedTickets?.length || 0,
      component: () => <Box p={3}><Typography>Related tickets tab - Coming in Phase 3</Typography></Box>,
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
          backgroundColor: '#fafafa'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Reference */}
          <Typography 
            variant="h6" 
            sx={{ 
              fontFamily: 'monospace',
              fontWeight: 600,
              color: 'primary.main'
            }}
          >
            #{ticket.reference}
          </Typography>

          {/* Status Badge */}
          {StatusBadge && (
            <StatusBadge
              value={ticket.status}
              uiSchema={{
                'ui:options': {
                  variant: 'filled',
                  size: 'small',
                  colorMap: {
                    'new': '#9c27b0',
                    'open': '#2196f3',
                    'in-progress': '#ff9800',
                    'pending': '#fbc02d',
                    'resolved': '#4caf50',
                    'closed': '#757575',
                    'on-hold': '#fbc02d'
                  },
                  iconMap: {
                    'new': 'fiber_new',
                    'open': 'folder_open',
                    'in-progress': 'pending',
                    'pending': 'schedule',
                    'resolved': 'check_circle',
                    'closed': 'check_circle_outline',
                    'on-hold': 'pause_circle'
                  }
                }
              }}
            />
          )}

          {/* Priority Badge */}
          {StatusBadge && ticket.priority && (
            <StatusBadge
              value={ticket.priority}
              uiSchema={{
                'ui:options': {
                  variant: 'filled',
                  size: 'small',
                  colorMap: {
                    'critical': '#d32f2f',
                    'high': '#f57c00',
                    'medium': '#1976d2',
                    'low': '#757575'
                  },
                  iconMap: {
                    'critical': 'local_fire_department',
                    'high': 'arrow_upward',
                    'medium': 'remove',
                    'low': 'arrow_downward'
                  }
                }
              }}
            />
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit ticket">
            <IconButton size="small">
              <Icon>edit</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="Add comment">
            <IconButton size="small">
              <Icon>comment</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="Assign ticket">
            <IconButton size="small">
              <Icon>person_add</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="Close ticket">
            <IconButton size="small">
              <Icon>close</Icon>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              icon={
                tab.badge && tab.badge > 0 ? (
                  <Badge badgeContent={tab.badge} color="primary">
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
            ticket={ticket} 
            reactory={reactory}
          />
        )}
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'SupportTicketDetailPanel',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketDetailPanel,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketDetailPanel,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketDetailPanel 
  });
}
