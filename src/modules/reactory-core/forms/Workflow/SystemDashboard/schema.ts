import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Workflow System Dashboard',
  properties: {
    systemStatus: {
      type: 'object',
      title: 'System Status',
      properties: {
        system: {
          type: 'object',
          properties: {
            initialized: { type: 'boolean', title: 'Initialized' },
            status: { type: 'string', title: 'Status' },
            timestamp: { type: 'string', title: 'Last Updated' }
          }
        },
        lifecycle: {
          type: 'object',
          title: 'Lifecycle Stats',
          properties: {
            activeInstances: { type: 'number', title: 'Active Instances' },
            completedInstances: { type: 'number', title: 'Completed Instances' },
            failedInstances: { type: 'number', title: 'Failed Instances' },
            pausedInstances: { type: 'number', title: 'Paused Instances' },
            totalInstances: { type: 'number', title: 'Total Instances' },
            averageExecutionTime: { type: 'number', title: 'Avg Execution Time' }
          }
        },
        configuration: {
          type: 'object',
          title: 'Configuration Stats',
          properties: {
            totalConfigurations: { type: 'number', title: 'Total Configurations' },
            activeConfigurations: { type: 'number', title: 'Active Configurations' },
            validationErrors: { type: 'number', title: 'Validation Errors' }
          }
        },
        security: {
          type: 'object',
          title: 'Security Stats',
          properties: {
            authenticatedRequests: { type: 'number', title: 'Authenticated Requests' },
            unauthorizedAttempts: { type: 'number', title: 'Unauthorized Attempts' },
            permissionDenials: { type: 'number', title: 'Permission Denials' }
          }
        }
      }
    },
    recentErrors: {
      type: 'array',
      title: 'Recent Errors',
      items: {
        type: 'object',
        properties: {
          errorType: { type: 'string', title: 'Error Type' },
          count: { type: 'number', title: 'Count' },
          lastOccurrence: { type: 'string', title: 'Last Occurrence' },
          workflowName: { type: 'string', title: 'Workflow Name' },
          message: { type: 'string', title: 'Message' }
        }
      }
    },
    quickActions: {
      type: 'object',
      title: 'Quick Actions',
      properties: {
        pauseSystem: { type: 'boolean', title: 'Pause System' },
        reloadConfigurations: { type: 'boolean', title: 'Reload Configurations' }
      }
    }
  }
};

export default schema;
