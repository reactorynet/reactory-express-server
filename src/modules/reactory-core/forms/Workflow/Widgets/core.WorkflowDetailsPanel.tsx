import Reactory from '@reactory/reactory-core';
import { WorkflowDetailPanelProps } from './types';

interface DetailPanelDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  StatusBadge: any;
  RelativeTime: any;
  CountBadge: any;
  WorkflowOverview: any;
  WorkflowInstanceHistory: any;
  WorkflowErrors: any;
  WorkflowSchedule: any;
  WorkflowLaunch: any;
  WorkflowConfiguration: any;
}

/**
 * WorkflowDetailsPanel Component
 * 
 * Comprehensive detail panel for workflow registry with tabbed interface.
 * 
 * Features:
 * - Header with workflow ID, status, namespace
 * - Tabbed interface (Overview, Run History, Errors, Schedule, Launch, Configuration)
 * - Action buttons for quick operations
 * - Integration with workflow launcher form
 * 
 * @example
 * // In MaterialTable detailPanel configuration
 * {
 *   componentMap: {
 *     DetailsPanel: "core.WorkflowDetailsPanel@1.0.0"
 *   }
 * }
 */
const WorkflowDetailsPanel = (props: WorkflowDetailPanelProps) => {
  const { reactory, workflow, useCase = 'grid', rowData } = props;
  
  if (!workflow) {
    return <div>No workflow data available</div>;
  }

  const { 
    React, 
    Material,
    StatusBadge,
    RelativeTime,
    CountBadge,
    WorkflowOverview,
    WorkflowInstanceHistory,
    WorkflowErrors,
    WorkflowSchedule,
    WorkflowLaunch,
    WorkflowConfiguration,
  } = reactory.getComponents<DetailPanelDependencies>([
    'react.React',
    'material-ui.Material',
    'core.StatusBadge',
    'core.RelativeTime',
    'core.CountBadge',
    'core.WorkflowOverview',
    'core.WorkflowInstanceHistory',
    'core.WorkflowErrors',
    'core.WorkflowSchedule',
    'core.WorkflowLaunch',
    'core.WorkflowConfiguration',
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
    Tooltip,
    Chip
  } = MaterialCore;

  const [activeTab, setActiveTab] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleTabChange = (event: any, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Calculate statistics
  const totalExecutions = workflow.statistics?.totalExecutions || 0;
  const failedExecutions = workflow.statistics?.failedExecutions || 0;
  const successfulExecutions = workflow.statistics?.successfulExecutions || 0;

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'info',
      component: WorkflowOverview,
      badge: 0,
    },
    {
      id: 'history',
      label: 'Run History',
      icon: 'history',
      badge: totalExecutions,
      component: WorkflowInstanceHistory,
    },
    {
      id: 'errors',
      label: 'Errors',
      icon: 'error',
      badge: failedExecutions,
      component: WorkflowErrors,
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: 'schedule',
      badge: 0,
      component: WorkflowSchedule,
    },
    {
      id: 'launch',
      label: 'Launch',
      icon: 'play_circle',
      badge: 0,
      component: WorkflowLaunch,
    },
    {
      id: 'configuration',
      label: 'Configuration',
      icon: 'settings',
      badge: workflow.dependencies?.length || 0,
      component: WorkflowConfiguration,
    },
  ];

  const ActiveTabComponent = tabs[activeTab]?.component;

  const executeWorkflow = () => {
    // Switch to launch tab
    setActiveTab(4);
  };

  const viewInstances = () => {
    // Navigate to instance management with filter
    reactory.navigation('/workflows/instances', {
      state: {
        filter: {
          workflowName: workflow.name,
          nameSpace: workflow.nameSpace
        }
      }
    });
  };

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
          {/* Workflow ID */}
          <Typography 
            variant="h6" 
            sx={{ 
              fontFamily: 'monospace',
              fontWeight: 600,
              color: 'primary.main'
            }}
          >
            {workflow.nameSpace}.{workflow.name}@{workflow.version}
          </Typography>

          {/* Status Badge */}
          {StatusBadge && (
            <StatusBadge
              value={workflow.isActive ? 'ACTIVE' : 'INACTIVE'}
              uiSchema={{
                'ui:options': {
                  variant: 'filled',
                  size: 'small',
                  colorMap: {
                    'ACTIVE': '#4caf50',
                    'INACTIVE': '#757575'
                  },
                  iconMap: {
                    'ACTIVE': 'check_circle',
                    'INACTIVE': 'cancel'
                  }
                }
              }}
            />
          )}

          {/* Namespace Badge */}
          <Chip
            label={workflow.nameSpace}
            size="small"
            icon={<Icon>folder</Icon>}
            color="primary"
            variant="outlined"
          />

          {/* Tags */}
          {workflow.tags && workflow.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {workflow.tags.slice(0, 3).map((tag: string) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                />
              ))}
              {workflow.tags.length > 3 && (
                <Chip
                  label={`+${workflow.tags.length - 3}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Execute workflow">
            <IconButton size="small" onClick={executeWorkflow} color="primary">
              <Icon>play_arrow</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="View instances">
            <IconButton size="small" onClick={viewInstances}>
              <Icon>history</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={handleRefresh}>
              <Icon>refresh</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title={workflow.isActive ? "Deactivate" : "Activate"}>
            <IconButton size="small" color={workflow.isActive ? "warning" : "success"}>
              <Icon>{workflow.isActive ? 'toggle_on' : 'toggle_off'}</Icon>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Statistics Summary Bar */}
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
          <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>play_circle</Icon>
          <Typography variant="body2" color="text.secondary">
            <strong>{totalExecutions}</strong> runs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ fontSize: 16, color: 'success.main' }}>check_circle</Icon>
          <Typography variant="body2" color="text.secondary">
            <strong>{successfulExecutions}</strong> successful
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ fontSize: 16, color: 'error.main' }}>error</Icon>
          <Typography variant="body2" color="text.secondary">
            <strong>{failedExecutions}</strong> failed
          </Typography>
        </Box>
        {workflow.statistics?.averageExecutionTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>timer</Icon>
            <Typography variant="body2" color="text.secondary">
              <strong>{Math.round(workflow.statistics.averageExecutionTime / 1000)}s</strong> avg
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
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              icon={
                tab.badge && tab.badge > 0 ? (
                  <Badge 
                    badgeContent={tab.badge} 
                    color={tab.id === 'errors' && tab.badge > 0 ? 'error' : 'primary'}
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
            workflow={workflow} 
            reactory={reactory}
            refreshKey={refreshKey}
          />
        )}
      </Box>
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowDetailsPanel',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowDetailsPanel,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowDetailsPanel,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowDetailsPanel 
  });
}
