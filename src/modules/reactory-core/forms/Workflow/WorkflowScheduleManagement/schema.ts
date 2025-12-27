import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Workflow Schedules',
  properties: {
    message: {
      type: 'string'
    },
    schedules: {
      type: 'array',
      title: 'Schedules',
      items: {
        type: 'object',
        title: 'Schedule ${formData.id}',
        properties: {
          id: {
            type: 'string',
            title: 'Schedule ID'
          },
          workflowName: {
            type: 'string',
            title: 'Workflow Name'
          },
          namespace: {
            type: 'string',
            title: 'Namespace'
          },
          cronExpression: {
            type: 'string',
            title: 'Cron Expression'
          },
          timezone: {
            type: 'string',
            title: 'Timezone'
          },
          enabled: {
            type: 'boolean',
            title: 'Enabled'
          },
          startDate: {
            type: 'string',
            title: 'Start Date',
            format: 'date-time'
          },
          endDate: {
            type: 'string',
            title: 'End Date',
            format: 'date-time'
          },
          maxExecutions: {
            type: 'number',
            title: 'Max Executions'
          },
          executionCount: {
            type: 'number',
            title: 'Execution Count'
          },
          lastExecution: {
            type: 'string',
            title: 'Last Execution',
            format: 'date-time'
          },
          nextExecution: {
            type: 'string',
            title: 'Next Execution',
            format: 'date-time'
          },
          createdAt: {
            type: 'string',
            title: 'Created At',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            title: 'Updated At',
            format: 'date-time'
          },
          createdBy: {
            type: 'string',
            title: 'Created By'
          },
          input: {
            type: 'object',
            title: 'Input Parameters'
          }
        }
      }
    }
  }
}

const WorkflowScheduleSchemaResolver = async (
  form: Reactory.Forms.IReactoryForm, 
  args: any, 
  context: Reactory.Server.IReactoryContext, 
  info: any
): Promise<Reactory.Schema.AnySchema> => {
  const { i18n, user } = context;
  
  return schema;
}

export default WorkflowScheduleSchemaResolver;
