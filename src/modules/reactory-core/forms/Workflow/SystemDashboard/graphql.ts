import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    workflowSystemStatus: {
      name: 'WorkflowSystemDashboard',
      text: `query WorkflowSystemDashboard {
        workflowSystemStatus {
          system {
            initialized
            status
            timestamp
          }
          lifecycle {
            activeInstances
            completedInstances
            failedInstances
            pausedInstances
            totalInstances
            averageExecutionTime
          }
          configuration {
            totalConfigurations
            activeConfigurations
            validationErrors
          }
          security {
            authenticatedRequests
            unauthorizedAttempts
            permissionDenials
          }
          errors {
            errorType
            count
            lastOccurrence
            workflowName
            message
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'systemStatus': 'data.systemStatus',
        'errors': 'data.recentErrors'
      }
    }
  },
  
  mutation: {
    pauseWorkflowSystem: {
      name: 'PauseWorkflowSystem',
      text: `mutation PauseWorkflowSystem {
        pauseWorkflowSystem {
          success
          message
        }
      }`,
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },
    
    resumeWorkflowSystem: {
      name: 'ResumeWorkflowSystem',
      text: `mutation ResumeWorkflowSystem {
        resumeWorkflowSystem {
          success
          message
        }
      }`,
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },
    
    reloadWorkflowConfigurations: {
      name: 'ReloadWorkflowConfigurations',
      text: `mutation ReloadWorkflowConfigurations {
        reloadWorkflowConfigurations {
          success
          message
        }
      }`,
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    }
  }
};

export default graphql;
