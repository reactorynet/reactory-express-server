import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {
    createSchedule: {
      name: 'CreateWorkflowSchedule',
      text: `mutation CreateWorkflowSchedule($config: ScheduleConfigInput!) {
        createWorkflowSchedule(config: $config) {
          id
          workflowName
          namespace
          cronExpression
          timezone
          enabled
          startDate
          endDate
          maxExecutions
          executionCount
          lastExecution
          nextExecution
          createdAt
          updatedAt
          createdBy
        }
      }`,
      variables: {
        'formData': 'config'
      },
      resultMap: {
        'id': 'id',
        'workflowName': 'workflowName'
      }
    },

    updateSchedule: {
      name: 'UpdateWorkflowSchedule',
      text: `mutation UpdateWorkflowSchedule($scheduleId: String!, $updates: UpdateScheduleInput!) {
        updateWorkflowSchedule(scheduleId: $scheduleId, updates: $updates) {
          id
          workflowName
          namespace
          cronExpression
          timezone
          enabled
          startDate
          endDate
          maxExecutions
          executionCount
          lastExecution
          nextExecution
          updatedAt
        }
      }`,
      variables: {
        'scheduleId': 'scheduleId',
        'formData': 'updates'
      },
      resultMap: {
        'id': 'id',
        'workflowName': 'workflowName'
      }
    },

    deleteSchedule: {
      name: 'DeleteWorkflowSchedule',
      text: `mutation DeleteWorkflowSchedule($scheduleId: String!) {
        deleteWorkflowSchedule(scheduleId: $scheduleId) {
          success
          message
        }
      }`,
      variables: {
        'scheduleId': 'scheduleId'
      },
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },

    startSchedule: {
      name: 'StartSchedule',
      text: `mutation StartSchedule($scheduleId: String!) {
        startSchedule(scheduleId: $scheduleId) {
          success
          message
        }
      }`,
      variables: {
        'scheduleId': 'scheduleId'
      },
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    },

    stopSchedule: {
      name: 'StopSchedule',
      text: `mutation StopSchedule($scheduleId: String!) {
        stopSchedule(scheduleId: $scheduleId) {
          success
          message
        }
      }`,
      variables: {
        'scheduleId': 'scheduleId'
      },
      resultMap: {
        'success': 'success',
        'message': 'message'
      }
    }
  },
  
  queries: {
    workflowSchedules: {
      name: 'WorkflowSchedules',
      text: `query WorkflowSchedules($pagination: PaginationInput) {
        workflowSchedules(pagination: $pagination) {
          schedules {
            id
            workflowName
            namespace
            cronExpression
            timezone
            enabled
            startDate
            endDate
            maxExecutions
            executionCount
            lastExecution
            nextExecution
            input
            createdAt
            updatedAt
            createdBy
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
        'schedules': 'schedules'
      }
    },

    workflowSchedule: {
      name: 'WorkflowSchedule',
      text: `query WorkflowSchedule($id: String!) {
        workflowSchedule(id: $id) {
          id
          workflowName
          namespace
          cronExpression
          timezone
          enabled
          startDate
          endDate
          maxExecutions
          executionCount
          lastExecution
          nextExecution
          input
          createdAt
          updatedAt
          createdBy
        }
      }`,
      resultType: 'object',
      variables: {
        'scheduleId': 'id'
      }
    }
  }
}

export default graphql;
