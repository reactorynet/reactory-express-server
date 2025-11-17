import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Workflow Instance Management',
  properties: {
    filterMessage: {
      type: 'string'
    },
    instances: {
      type: 'array',
      title: 'Workflow Instances',
      items: {
        type: 'object',
        title: 'Instance ${formData.id}',
        properties: {
          id: {
            type: 'string',
            title: 'Instance ID'
          },
          workflowName: {
            type: 'string',
            title: 'Workflow Name'
          },
          namespace: {
            type: 'string',
            title: 'Namespace'
          },
          version: {
            type: 'string',
            title: 'Version'
          },
          status: {
            type: 'string',
            title: 'Status',
            enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED', 'CANCELLED']
          },
          progress: {
            type: 'number',
            title: 'Progress'
          },
          startTime: {
            type: 'string',
            title: 'Start Time',
            format: 'date-time'
          },
          endTime: {
            type: 'string',
            title: 'End Time',
            format: 'date-time'
          },
          duration: {
            type: 'number',
            title: 'Duration (ms)'
          },
          createdBy: {
            type: 'string',
            title: 'Created By'
          },
          tags: {
            type: 'array',
            title: 'Tags',
            items: {
              type: 'string'
            }
          },
          error: {
            type: 'object',
            title: 'Error Details',
            properties: {
              message: { type: 'string', title: 'Error Message' },
              code: { type: 'string', title: 'Error Code' },
              stack: { type: 'string', title: 'Stack Trace' }
            }
          },
          steps: {
            type: 'array',
            title: 'Steps',
            items: {
              type: 'object',
              properties: {
                stepId: { type: 'string', title: 'Step ID' },
                name: { type: 'string', title: 'Step Name' },
                status: { type: 'string', title: 'Status' },
                startTime: { type: 'string', title: 'Start Time' },
                endTime: { type: 'string', title: 'End Time' },
                duration: { type: 'number', title: 'Duration' }
              }
            }
          }
        }
      }
    }
  }
};

export default schema;
