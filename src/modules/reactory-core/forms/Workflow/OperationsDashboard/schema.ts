import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Workflow Operations Dashboard',
  properties: {
    metrics: {
      type: 'object',
      title: 'Key Metrics',
      properties: {
        lifecycle: {
          type: 'object',
          title: 'Workflow Lifecycle',
          properties: {
            activeInstances: { type: 'number', title: 'Active Instances' },
            completedInstances: { type: 'number', title: 'Completed Today' },
            failedInstances: { type: 'number', title: 'Failed Today' },
            averageExecutionTime: { type: 'number', title: 'Avg Execution Time' }
          }
        },
        scheduler: {
          type: 'object',
          title: 'Scheduler Metrics',
          properties: {
            activeSchedules: { type: 'number', title: 'Active Schedules' },
            executionsToday: { type: 'number', title: 'Executions Today' },
            missedExecutions: { type: 'number', title: 'Missed Executions' },
            nextExecution: { type: 'string', title: 'Next Execution' }
          }
        },
        performance: {
          type: 'object',
          title: 'Performance Stats',
          properties: {
            throughput: { type: 'number', title: 'Workflows/Hour' },
            errorRate: { type: 'number', title: 'Error Rate %' },
            queueDepth: { type: 'number', title: 'Queue Depth' },
            resourceUtilization: { type: 'number', title: 'Resource Usage %' }
          }
        }
      }
    },
    recentActivity: {
      type: 'array',
      title: 'Recent Activity',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', title: 'Time' },
          event: { type: 'string', title: 'Event' },
          workflowName: { type: 'string', title: 'Workflow' },
          instanceId: { type: 'string', title: 'Instance ID' },
          status: { type: 'string', title: 'Status' },
          user: { type: 'string', title: 'User' }
        }
      }
    },
    alerts: {
      type: 'array',
      title: 'Active Alerts',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', title: 'Severity' },
          message: { type: 'string', title: 'Message' },
          timestamp: { type: 'string', title: 'Time' },
          source: { type: 'string', title: 'Source' },
          acknowledged: { type: 'boolean', title: 'Acknowledged' }
        }
      }
    },
    topWorkflows: {
      type: 'array',
      title: 'Top Workflows',
      items: {
        type: 'object',
        properties: {
          workflowName: { type: 'string', title: 'Workflow Name' },
          namespace: { type: 'string', title: 'Namespace' },
          executions: { type: 'number', title: 'Executions' },
          successRate: { type: 'number', title: 'Success Rate' },
          avgDuration: { type: 'number', title: 'Avg Duration' }
        }
      }
    }
  }
};

export default schema;
