import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Workflow Launcher',
  description: 'Launch workflow instances with custom parameters',
  properties: {
    workflowId: {
      type: 'string',
      title: 'Workflow',
      description: 'Select the workflow to execute'
    },
    workflowDetails: {
      type: 'object',
      title: 'Workflow Details',
      properties: {
        name: { type: 'string', title: 'Name' },
        namespace: { type: 'string', title: 'Namespace' },
        version: { type: 'string', title: 'Version' },
        description: { type: 'string', title: 'Description' },
        tags: { 
          type: 'array', 
          title: 'Tags',
          items: { type: 'string' }
        }
      }
    },
    executionInput: {
      type: 'object',
      title: 'Execution Parameters',
      properties: {
        input: {
          type: 'string',
          title: 'Input Data (JSON)',
          description: 'Provide input data for the workflow in JSON format'
        },
        tags: {
          type: 'array',
          title: 'Execution Tags',
          description: 'Optional tags to identify this execution',
          items: {
            type: 'string'
          }
        },
        priority: {
          type: 'number',
          title: 'Priority',
          description: 'Execution priority (1-10, higher is more priority)',
          minimum: 1,
          maximum: 10,
          default: 5
        },
        timeout: {
          type: 'number',
          title: 'Timeout (seconds)',
          description: 'Maximum execution time in seconds',
          minimum: 30,
          maximum: 3600,
          default: 300
        }
      },
      required: ['input']
    },
    scheduleExecution: {
      type: 'boolean',
      title: 'Schedule for Later',
      description: 'Schedule this workflow for future execution',
      default: false
    },
    scheduleDetails: {
      type: 'object',
      title: 'Schedule Configuration',
      properties: {
        scheduledTime: {
          type: 'string',
          title: 'Scheduled Time',
          format: 'date-time',
          description: 'When should this workflow execute'
        },
        timezone: {
          type: 'string',
          title: 'Timezone',
          default: 'UTC',
          enum: [
            'UTC', 'America/New_York', 'America/Los_Angeles', 
            'Europe/London', 'Europe/Paris', 'Asia/Tokyo'
          ]
        }
      },
      dependencies: {
        scheduleExecution: true
      }
    },
    executionResult: {
      type: 'object',
      title: 'Execution Result',
      properties: {
        instanceId: { type: 'string', title: 'Instance ID' },
        status: { type: 'string', title: 'Status' },
        message: { type: 'string', title: 'Message' },
        startedAt: { type: 'string', title: 'Started At' }
      }
    }
  },
  required: ['workflowId', 'executionInput']
};

export default schema;
