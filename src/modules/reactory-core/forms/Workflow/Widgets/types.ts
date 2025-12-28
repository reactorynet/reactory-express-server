// Workflow Widget Types

export interface WorkflowDetailPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow: any;
  useCase?: string;
  rowData?: any;
}

export interface WorkflowOverviewProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow: any;
}

export interface WorkflowInstanceHistoryProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow: any;
}

export interface WorkflowErrorsProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow: any;
}

export interface WorkflowScheduleProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow: any;
}

export interface WorkflowLaunchProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow: any;
}

export interface WorkflowConfigurationProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow: any;
}

export interface WorkflowManagerProps {
  reactory: Reactory.Client.IReactoryApi;
}

export interface WorkflowManagerModule {
  toggleWorkflow(args: { workflow: any }): Promise<boolean>;
  executeWorkflow(args: { workflow: any; input?: any }): Promise<any>;
  viewInstances(args: { workflow: any }): void;
}
