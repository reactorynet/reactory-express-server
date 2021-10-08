import { Reactory } from "types/reactory";


class ReactoryWorkflowService implements Reactory.Service.IReactoryWorkflowService {

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.IReactoryContext
  props: any;

  constructor(props: any, context: Reactory.IReactoryContext) {
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

  getExecutionContext(): Reactory.IReactoryContext {
    return this.context;
  }
  
  setExecutionContext(executionContext: Reactory.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  static definition: Reactory.IReactoryServiceDefinition = {
    id: 'core.ReactoryWorkflowService@1.0.0',
    name: 'Reactory Worklflow Service',
    description: 'Provides service functionality for workflows',
    service: (props, context) => {
      return new ReactoryWorkflowService(props, context);
    },
    dependencies: [],
    serviceType: "workflow"
  }
}


export default  ReactoryWorkflowService;