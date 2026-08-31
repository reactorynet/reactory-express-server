import Reactory from '@reactorynet/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {
    activateWorkflow: {
      name: 'ActivateWorkflow',
      text: `mutation ActivateWorkflow($nameSpace: String!, $name: String!) {
        activateWorkflow(nameSpace: $nameSpace, name: $name) {
          success
          message
        }
      }`,
      variables: {
        'formData.nameSpace': 'nameSpace',
        'formData.name': 'name'
      },
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },

    deactivateWorkflow: {
      name: 'DeactivateWorkflow',
      text: `mutation DeactivateWorkflow($nameSpace: String!, $name: String!) {
        deactivateWorkflow(nameSpace: $nameSpace, name: $name) {
          success
          message
        }
      }`,
      variables: {
        'formData.nameSpace': 'nameSpace',
        'formData.name': 'name'
      },
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    }
  },
  
  queries: {
    registeredWorkflows: {
      name: 'workflows',
      text: `query RegisteredWorkflows($filter: WorkflowFilterInput, $pagination: PaginationInput) {
        workflows(filter: $filter, pagination: $pagination) {
          workflows {
            id
            name
            nameSpace
            version
            description
            tags
            author
            createdAt
            updatedAt
            status
            isActive
            hasSchedule
            workflowType
            location
            dependencies {
              id
              name
              nameSpace
              type
              version
              optional
              description
            }
            statistics {
              totalExecutions
              successfulExecutions
              failedExecutions
              averageExecutionTime
            }
          }
          pagination {
            page
            pages
            limit
            total
          }
        }
      }`,
      variables: {
        'filter': 'filter',
        'filter.searchString': 'filter.searchString',
        'filter.nameSpace': 'filter.nameSpace',
        'filter.name': 'filter.name',
        'filter.version': 'filter.version',
        'filter.isActive': 'filter.isActive',
        'filter.tags': 'filter.tags',
        'filter.author': 'filter.author',
        'filter.hasSchedule': 'filter.hasSchedule',
        'filter.hasErrors': 'filter.hasErrors',
        'filter.neverRun': 'filter.neverRun',
        'filter.recentlyUpdated': 'filter.recentlyUpdated',
        'paging.page': 'pagination.page',
        'paging.pageSize': 'pagination.limit'
      },
      resultType: 'object',
      resultMap: {
        'pagination.page': 'paging.page',
        'pagination.total': 'paging.total',
        'pagination.limit': 'paging.pageSize',
        'workflows': 'data'
      }
    },

    workflowDetails: {
      name: 'WorkflowDetails',
      text: `query WorkflowDetails($nameSpace: String!, $name: String!) {
        workflow(nameSpace: $nameSpace, name: $name) {
          name
          nameSpace
          version
          description
          tags
          author
          createdAt
          updatedAt
          isActive
          dependencies {
            name
            type
            version
            optional
            description
          }
          statistics {
            totalExecutions
            successfulExecutions
            failedExecutions
            averageExecutionTime
          }
          instances {
            id
            status
            startTime
            endTime
            duration
          }
        }
      }`,
      resultType: 'object',
      variables: {
        'nameSpace': 'nameSpace',
        'name': 'name'
      }
    }
  }
}

export default graphql;
