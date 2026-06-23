/**
 * Designer definition types for the workflow step catalog.
 *
 * A module that contributes a workflow step (via IWorkflowStepProvider) can also
 * attach an `IWorkflowStepDesignerDefinition` describing how the Visual Workflow
 * Designer should render and configure it. These definitions are surfaced to the
 * PWA designer via the `workflowStepCatalog` GraphQL query and merged with the
 * designer's built-in step library.
 *
 * The schema/uiSchema/rendering fields are opaque JSON to the server — they are
 * authored against the PWA's `StepDefinition` shape and passed through verbatim.
 */

export interface IStepDesignerPort {
  /** Port name (e.g. 'previous', 'next', 'result'). */
  name: string;
  /** PortType: input | output | control_input | control_output. */
  type: string;
  /** Optional data type hint. */
  dataType?: string;
  required?: boolean;
  description?: string;
}

export interface IWorkflowStepDesignerDefinition {
  /** Engine step type id; defaults to the registered stepType when omitted. */
  id?: string;
  name?: string;
  /** Designer category (control | action | logic | flow | integration | interaction | observability). */
  category?: string;
  description?: string;
  icon?: string;
  color?: string;
  inputPorts?: IStepDesignerPort[];
  outputPorts?: IStepDesignerPort[];
  /** JSON Schema for the step's static config form. */
  propertySchema?: Record<string, any>;
  /** rjsf ui schema for the config form. */
  uiSchema?: Record<string, any>;
  /** JSON Schema for the dynamic inputs form. */
  inputsSchema?: Record<string, any>;
  inputsUiSchema?: Record<string, any>;
  defaultProperties?: Record<string, any>;
  tags?: string[];
  /** Renderer config (WebGL/SVG/Canvas) — matches the PWA StepRenderConfig. */
  rendering?: Record<string, any>;
}

/** One entry returned by the workflow step catalog. */
export interface IWorkflowStepCatalogEntry {
  /** The engine step type id (matches the registry key). */
  stepType: string;
  /** Human-readable description (from registration options). */
  description?: string;
  /** Step version (from registration options). */
  version?: string;
  /** Where the step came from: a core built-in or a module contribution. */
  source: 'core' | 'module';
  /** Designer rendering/config definition, when the contributor provided one. */
  definition?: IWorkflowStepDesignerDefinition;
}
