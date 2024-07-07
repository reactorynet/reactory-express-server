import Reactory from "@reactory/reactory-core";

export type CliContext = Reactory.Server.IReactoryContext & Reactory.Server.IReactoryCliContext;

export type TCLI = (kwargs: string[], context?: CliContext) => Promise<void>;

export interface FormJob {
  form: string
  props?: any;
  propsMap?: Reactory.ObjectMap;
  state?: any;
}

export interface CliJob {
  command: string | Reactory.FQN;
  args?: string[]
}

export interface ServiceJob {
  service: string | Reactory.FQN;
  method: string;
  params?: any[];
  paramsMap?: Reactory.ObjectMap
  state?: any;
}

export interface WorkflowJob {
  workflow: string | Reactory.FQN
  props?: any;
  propsMap?: Reactory.ObjectMap;
  state?: any
}

export type Job = CliJob | ServiceJob | WorkflowJob | FormJob; 

export interface CliConfig {
  version: string;
  partner?: string;
  user?: string;
  password?: string;
  jobs?: Job[];
  logLevel?: string;
}


