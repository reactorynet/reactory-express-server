import Reactory from '@reactory/reactory-core';

const schema: Reactory.Schema.ISchema = {
  type: 'object',
  title: 'Workflow Registry',
  properties: {
    message: {
      type: 'string'
    },
    workflows: {
      type: 'array',
      title: 'Workflows',
      items: {
        type: 'object',
        title: 'Workflow ${formData.nameSpace}.${formData.name}@${formData.version}',
        properties: {
          id: {
            type: 'string',
            title: 'ID'
          },
          name: {
            type: 'string',
            title: 'Name'
          },
          nameSpace: {
            type: 'string',
            title: 'Namespace'
          },
          version: {
            type: 'string',
            title: 'Version'
          },
          description: {
            type: 'string',
            title: 'Description'
          },
          isActive: {
            type: 'boolean',
            title: 'Active'
          },
          tags: {
            type: 'array',
            title: 'Tags',
            items: {
              type: 'string'
            }
          },
          author: {
            type: 'string',
            title: 'Author'
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
          dependencies: {
            type: 'array',
            title: 'Dependencies',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', title: 'Name' },
                type: { type: 'string', title: 'Type' },
                version: { type: 'string', title: 'Version' },
                optional: { type: 'boolean', title: 'Optional' },
                description: { type: 'string', title: 'Description' }
              }
            }
          },
          statistics: {
            type: 'object',
            title: 'Statistics',
            properties: {
              totalExecutions: { type: 'number', title: 'Total Executions' },
              successfulExecutions: { type: 'number', title: 'Successful Executions' },
              failedExecutions: { type: 'number', title: 'Failed Executions' },
              averageExecutionTime: { type: 'number', title: 'Average Execution Time' }
            }
          }
        }
      }
    }
  }
}

const WorkflowRegistrySchemaResolver = async (
  form: Reactory.Forms.IReactoryForm, 
  args: any, 
  context: Reactory.Server.IReactoryContext, 
  info: any
): Promise<Reactory.Schema.AnySchema> => {
  const { i18n, user } = context;
  
  return schema;
}

export default WorkflowRegistrySchemaResolver;
