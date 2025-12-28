import Reactory from '@reactory/reactory-core';
import { WorkflowManagerProps, WorkflowManagerModule } from './types';

/**
 * WorkflowManager Module
 * 
 * Handles workflow operations like toggle, execute, view instances
 */
const WorkflowManager = (props: WorkflowManagerProps): WorkflowManagerModule => {
  const { reactory } = props;

  const toggleWorkflow = async (args: { workflow: any }): Promise<boolean> => {
    const { workflow } = args;

    try {
      const mutation = workflow.isActive ? 'deactivateWorkflow' : 'activateWorkflow';
      
      const result = await reactory.graphqlMutation(`
        mutation ${mutation}($nameSpace: String!, $name: String!) {
          ${mutation}(nameSpace: $nameSpace, name: $name) {
            success
            message
          }
        }
      `, {
        nameSpace: workflow.nameSpace,
        name: workflow.name
      });

      if (result.data?.[mutation]?.success) {
        reactory.createNotification(
          `Workflow ${workflow.isActive ? 'deactivated' : 'activated'} successfully`,
          { type: 'success' }
        );
        
        // Emit refresh event
        reactory.emit('core.WorkflowUpdatedEvent', { workflow });
        
        return true;
      } else {
        throw new Error(result.data?.[mutation]?.message || 'Operation failed');
      }
    } catch (error: any) {
      reactory.createNotification(
        `Failed to ${workflow.isActive ? 'deactivate' : 'activate'} workflow: ${error.message}`,
        { type: 'error' }
      );
      reactory.log('Error toggling workflow', error, 'error');
      return false;
    }
  };

  const executeWorkflow = async (args: { workflow: any; input?: any }): Promise<any> => {
    const { workflow, input = {} } = args;

    try {
      const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;

      const result = await reactory.graphqlMutation(`
        mutation StartWorkflow($workflowId: String!, $input: WorkflowExecutionInput) {
          startWorkflow(workflowId: $workflowId, input: $input) {
            id
            workflowName
            nameSpace
            status
            startTime
          }
        }
      `, {
        workflowId,
        input: {
          input,
          tags: ['executed-from-grid'],
          priority: 1
        }
      });

      if (result.data?.startWorkflow) {
        reactory.createNotification(
          'Workflow started successfully',
          { type: 'success' }
        );
        
        return result.data.startWorkflow;
      } else {
        throw new Error('Failed to start workflow');
      }
    } catch (error: any) {
      reactory.createNotification(
        `Failed to execute workflow: ${error.message}`,
        { type: 'error' }
      );
      reactory.log('Error executing workflow', error, 'error');
      throw error;
    }
  };

  const viewInstances = (args: { workflow: any }): void => {
    const { workflow } = args;
    
    reactory.navigation('/workflows/instances', {
      state: {
        filter: {
          workflowName: workflow.name,
          nameSpace: workflow.nameSpace
        }
      }
    });
  };

  return {
    toggleWorkflow,
    executeWorkflow,
    viewInstances
  };
};

const Definition: any = {
  name: 'WorkflowManager',
  nameSpace: 'core',
  version: '1.0.0',
  component: null,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR'],
  componentType: ''
}

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  const reactory: Reactory.Client.IReactoryApi = window.reactory.api as Reactory.Client.IReactoryApi;
  reactory.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowManager({ reactory }),
    ['Workflow'],
    Definition.roles,
    false,
    [],
    'workflow'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowManager 
  });
}
