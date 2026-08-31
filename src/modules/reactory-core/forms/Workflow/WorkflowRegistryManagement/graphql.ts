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
        'query.search': 'filter.searchString',
        'query.nameSpace': 'filter.nameSpace',
        'query.name': 'filter.name',
        'query.version': 'filter.version',
        'query.isActive': 'filter.isActive',
        'query.tags': 'filter.tags',
        'query.author': 'filter.author',
        'query.hasSchedule': 'filter.hasSchedule',
        'query.hasErrors': 'filter.hasErrors',
        'query.neverRun': 'filter.neverRun',
        'query.recentlyUpdated': 'filter.recentlyUpdated',
        'query.page': 'pagination.page',
        'query.pageSize': 'pagination.limit'
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
