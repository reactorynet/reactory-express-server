import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    workflows: {
      name: 'WorkflowsForLauncher',
      text: `query WorkflowsForLauncher($filter: WorkflowFilterInput) {
        workflows(filter: $filter) {
          workflows {
            name
            namespace
            version
            description
            tags
            author
            isActive
            dependencies {
              name
              type
              version
              optional
            }
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'workflows': 'data.workflows'
      }
    },
    
    workflowDetails: {
      name: 'WorkflowDetails',
      text: `query WorkflowDetails($namespace: String!, $name: String!) {
        workflow(namespace: $namespace, name: $name) {
          name
          namespace
          version
          description
          tags
          author
          configuration {
            timeout
            maxRetries
            priority
            parallelism
          }
          dependencies {
            name
            type
            version
            optional
            description
          }
        }
      }`,
      variables: {
        'workflowNamespace': 'namespace',
        'workflowName': 'name'
      },
      resultType: 'object'
    }
  },
  
  mutation: {
    new: {
      name: 'LaunchWorkflow',
      text: `mutation LaunchWorkflow($workflowId: String!, $input: WorkflowExecutionInput) {
        startWorkflow(workflowId: $workflowId, input: $input) {
          id
          workflowName
          namespace
          version
          status
          startTime
          createdBy
          tags
        }
      }`,
      variables: {
        'formData.workflowId': 'workflowId',
        'formData.executionInput': 'input'
      },
      resultMap: {
        'executionResult.instanceId': 'id',
        'executionResult.status': 'status',
        'executionResult.message': 'message',
        'executionResult.startedAt': 'startTime'
      },
      resultType: 'object',
      onSuccessMethod: ["notification"],
      notification: {
        inAppNotification: true,
        title: 'Workflow launched successfully',
        props: {
          timeOut: 5000,
          canDismiss: true,
        }
      }
    },
    
    scheduleWorkflow: {
      name: 'ScheduleWorkflow',
      text: `mutation ScheduleWorkflow($config: ScheduleConfigInput!) {
        createWorkflowSchedule(config: $config) {
          id
          workflowName
          namespace
          cronExpression
          timezone
          enabled
          startDate
          endDate
          nextExecution
          createdAt
        }
      }`,
      variables: {
        'formData.scheduleConfig': 'config'
      },
      resultMap: {
        'executionResult.scheduleId': 'id',
        'executionResult.nextExecution': 'nextExecution',
        'executionResult.message': 'message'
      },
      resultType: 'object',
      onSuccessMethod: ["notification"],
      notification: {
        inAppNotification: true,
        title: 'Workflow scheduled successfully',
        props: {
          timeOut: 5000,
          canDismiss: true,
        }
      }
    }
  }
};

export default graphql;
