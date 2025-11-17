import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    workflowMetrics: {
      name: 'WorkflowOperationsDashboard',
      text: `query WorkflowOperationsDashboard {
        workflowMetrics {
          lifecycle {
            activeInstances
            completedInstances
            failedInstances
            totalInstances
            averageExecutionTime
          }
          scheduler {
            activeSchedules
            executionsToday
            missedExecutions
            nextExecution
            lastExecution
            averageExecutionDelay
          }
          errors {
            errorType
            count
            lastOccurrence
            workflowName
            message
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
        }
        
        workflowAuditLog(pagination: { page: 1, limit: 10 }) {
          entries {
            id
            timestamp
            event
            workflowName
            workflowNamespace
            instanceId
            userId
            action
            success
          }
        }
        
        workflows(pagination: { page: 1, limit: 5 }) {
          workflows {
            name
            namespace
            version
            description
            isActive
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'lifecycle': 'data.metrics.lifecycle',
        'scheduler': 'data.metrics.scheduler',
        'performance': 'data.metrics.performance',
        'recentActivity': 'data.recentActivity',
        'alerts': 'data.alerts',
        'topWorkflows': 'data.topWorkflows'
      }
    },
    
    workflowAlerts: {
      name: 'WorkflowAlerts',
      text: `query WorkflowAlerts {
        workflowSystemStatus {
          errors {
            errorType
            count
            lastOccurrence
            workflowName
            message
          }
          security {
            securityEvents {
              event
              timestamp
              userId
              severity
            }
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'errors': 'data.errors',
        'securityEvents': 'data.securityEvents'
      }
    }
  },
  
  mutation: {
    acknowledgeAlert: {
      name: 'AcknowledgeAlert',
      text: `mutation AcknowledgeAlert($alertId: String!) {
        acknowledgeAlert(alertId: $alertId) {
          success
          message
        }
      }`,
      variables: {
        'alertId': 'alertId'
      },
      resultType: 'object',
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },
    
    dismissAlert: {
      name: 'DismissAlert',
      text: `mutation DismissAlert($alertId: String!) {
        dismissAlert(alertId: $alertId) {
          success
          message
        }
      }`,
      variables: {
        'alertId': 'alertId'
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
