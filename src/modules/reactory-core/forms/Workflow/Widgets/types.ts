// Workflow Widget Types

export interface WorkflowDetailPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  workflow?: any;
  formData?: any;
  data?: any;
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
  /**
   * Optional key to trigger a refresh of the data.
   * Change this value to force a re-fetch of instances and history.
   */
  refreshKey?: string | number;
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

export interface WorkflowDataViewerProps {
  reactory: Reactory.Client.IReactoryApi;
  /**
   * The JSON-serializable data to display. Can be the full workflow data
   * payload or a slice of it (e.g. a single step's `stepResults[stepId]`).
   */
  data: any;
  /**
   * Optional heading shown above the viewer, alongside the format toggle.
   */
  title?: string;
  /**
   * Message shown when `data` is empty/undefined.
   */
  emptyMessage?: string;
  /**
   * When provided, a download button is shown that saves the current view
   * (JSON or YAML) as `<downloadFileName>.<json|yaml>`.
   */
  downloadFileName?: string;
  /**
   * Initial format shown ('json' | 'yaml'). Default 'json'.
   */
  defaultFormat?: 'json' | 'yaml';
  /**
   * Max height (px) of the scrollable code block. Default 600.
   */
  maxHeight?: number;
}

export interface WorkflowInstanceInspectorProps {
  reactory: Reactory.Client.IReactoryApi;
  /**
   * The workflow instance ID to inspect.
   */
  instanceId: string;
  /**
   * Optional callback when the inspector is closed.
   */
  onClose?: () => void;
}

export interface WorkflowManagerProps {
  reactory: Reactory.Client.IReactoryApi;
}

export interface WorkflowManagerModule {
  toggleWorkflow(args: { workflow: any }): Promise<boolean>;
  executeWorkflow(args: { workflow: any; input?: any }): Promise<any>;
  viewInstances(args: { workflow: any }): void;
}
