import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    workflowInstances: {
      name: 'WorkflowInstances',
      text: `query WorkflowInstances($filter: InstanceFilterInput, $pagination: PaginationInput) {
        workflowInstances(filter: $filter, pagination: $pagination) {
          instances {
            id
            workflowName
            namespace
            version
            status
            progress
            startTime
            endTime
            duration
            createdBy
            tags
            error {
              message
              code
              stack
            }
            steps {
              stepId
              name
              status
              startTime
              endTime
              duration
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
      resultType: 'object',
      resultMap: {
        'paging.page': 'pagination.page',
        'paging.total': 'pagination.total',
        'paging.pageSize': 'pagination.limit',
        'instances': 'instances'
      }
    },
    
    workflowInstance: {
      name: 'WorkflowInstance',
      text: `query WorkflowInstance($id: String!) {
        workflowInstance(id: $id) {
          id
          workflowName
          namespace
          version
          status
          progress
          startTime
          endTime
          duration
          input
          output
          createdBy
          tags
          error {
            message
            code
            stack
          }
          steps {
            stepId
            name
            status
            startTime
            endTime
            duration
          }
        }
      }`,
      resultType: 'object',
      variables: {
        'instanceId': 'id'
      }
    }
  },
  
  mutation: {
    pauseWorkflowInstance: {
      name: 'PauseWorkflowInstance',
      text: `mutation PauseWorkflowInstance($instanceId: String!) {
        pauseWorkflowInstance(instanceId: $instanceId) {
          success
          message
          data
        }
      }`,
      variables: {
        'instanceId': 'instanceId'
      },
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },
    
    resumeWorkflowInstance: {
      name: 'ResumeWorkflowInstance',
      text: `mutation ResumeWorkflowInstance($instanceId: String!) {
        resumeWorkflowInstance(instanceId: $instanceId) {
          success
          message
          data
        }
      }`,
      variables: {
        'instanceId': 'instanceId'
      },
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },
    
    cancelWorkflowInstance: {
      name: 'CancelWorkflowInstance',
      text: `mutation CancelWorkflowInstance($instanceId: String!) {
        cancelWorkflowInstance(instanceId: $instanceId) {
          success
          message
          data
        }
      }`,
      variables: {
        'instanceId': 'instanceId'
      },
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },
    
    pauseWorkflowInstances: {
      name: 'PauseWorkflowInstances',
      text: `mutation PauseWorkflowInstances($instanceIds: [String!]!) {
        pauseWorkflowInstances(instanceIds: $instanceIds) {
          success
          message
          data
        }
      }`,
      variables: {
        'instanceIds': 'instanceIds'
      },
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },
    
    resumeWorkflowInstances: {
      name: 'ResumeWorkflowInstances',
      text: `mutation ResumeWorkflowInstances($instanceIds: [String!]!) {
        resumeWorkflowInstances(instanceIds: $instanceIds) {
          success
          message
          data
        }
      }`,
      variables: {
        'instanceIds': 'instanceIds'
      },
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },
    
    cancelWorkflowInstances: {
      name: 'CancelWorkflowInstances',
      text: `mutation CancelWorkflowInstances($instanceIds: [String!]!) {
        cancelWorkflowInstances(instanceIds: $instanceIds) {
          success
          message
          data
        }
      }`,
      variables: {
        'instanceIds': 'instanceIds'
      },
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    }
  }
};

export default graphql;
