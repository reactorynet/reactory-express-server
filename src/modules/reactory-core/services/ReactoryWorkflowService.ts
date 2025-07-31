import Reactory from '@reactory/reactory-core';
import { service } from '@reactory/server-core/application/decorators';

@service({
  name: "ReactoryWorkflowService",
  nameSpace: "core",
  version: "1.0.0",
  description: "Service for managing workflows in Reactory",
  id: "core.ReactoryWorkflowService@1.0.0",
  serviceType: "workflow",
  dependencies: []
})
class ReactoryWorkflowService implements Reactory.Service.IReactoryWorkflowService {

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.Server.IReactoryContext
  props: any;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  startWorkflow(workflow_id: string, input: any): Promise<Reactory.IWorkflow> {
    return true;
  }

  stopWorkflow(worflow_id: string, instance: string): Promise<any> {
    return true;
  }

  workflowStatus(worflow_id: string, instance: string): Promise<any> {
    return "COMPLETE";
  }

  clearWorkflows(): Promise<any> {

  }

  onStartup(): Promise<any> {
    this.context.log(`Workflow service startup ${this.context.colors.green('STARTUP OKAY')} ✅`);
    return Promise.resolve(true)
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }
}


export default  ReactoryWorkflowService;