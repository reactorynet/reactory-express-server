import { Service, Server, IReactoryComponentDefinition, IReactoryComponentFeature } from '@reactory/reactory-core'; // import necessary types
import { service } from "@reactory/server-core/application/decorators/service";

@service({
  id: "core.ReactoryModelRegistry@1.0.0",
  name: "Reactory Model Registry Service",
  description: "Provides registry features for any reactory model",
  serviceType: "data",
  dependencies: [
    { id: "core.FetchService@1.0.0", alias: "fetchService" },
    { id: "core.FileService@1.0.0", alias: "fileService" },
  ]
})
export class ReactoryModelRegistry implements Reactory.Service.TReactoryModelRegistryService {
  name: string;
  nameSpace: string;
  version: string;
  context: Server.IReactoryContext;

  private modelRegistry: IReactoryComponentDefinition<unknown>[] = [];
  private replacedModels: IReactoryComponentDefinition<unknown>[] = [];

  private fetchService: Reactory.Service.IFetchService;
  private fileService: Reactory.Service.IReactoryFileService;
  
  
  constructor(props: Service.IReactoryServiceProps, context: Server.IReactoryContext) {
    this.name = props.name;
    this.nameSpace = props.nameSpace;
    this.version = props.version;
    this.context = context;
  }

  onStartup(): Promise<void> {
    // Implement startup logic
    return Promise.resolve();
  }

  onShutdown(): Promise<void> {
    // Implement shutdown logic
    return Promise.resolve();
  }

  getExecutionContext(): Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(executionContext: Server.IReactoryContext): void {
    this.context = executionContext;
  }

  setFileService(fileService: Reactory.Service.IReactoryFileService): void {
    this.fileService = fileService;
  }

  setFetchService(fetchService: Reactory.Service.IFetchService): void {
    this.fetchService = fetchService;
  }

  register<T>(model: IReactoryComponentDefinition<T>, overwrite: boolean = false): void {
    if (this.modelRegistry.find(m => m.name === model.name)) {
      if (overwrite) {
        this.modelRegistry.splice(this.modelRegistry.findIndex(m => m.name === model.name), 1);
        this.replacedModels.push(model);
      } else {
        throw new Error(`Model ${model.name} already exists. Use overwrite flag to overwrite.`);
      }
    }
    this.modelRegistry.push(model);
  }

  getModel<T>(specs: Partial<IReactoryComponentDefinition<T>>): T | null {
    const result = this.findMatchingComponent(specs);
    if(result === null) return null;
    return (result as IReactoryComponentDefinition<T>).component as T;
  }

  getModels<T>(spec: Partial<IReactoryComponentDefinition<T>>): T[] {
    // Implement logic to return multiple models
    return [];
  }

  generate<T>(spec: Partial<IReactoryComponentDefinition<T>>): T {
    // Implement logic to generate a model object based on spec
    return ({} as IReactoryComponentDefinition<T>).component as T;
  }

  private compareStem(stemA: string, stemB: string, threshold: number = 0.8): boolean {
    // Your comparison logic
    return stemA === stemB;
  }

  private compareFeatures(specs: IReactoryComponentFeature[], componentFeature: IReactoryComponentFeature[], threshold: number = 0.8): boolean {
    // Your comparison logic
    if (componentFeature.length === 0) return true;
    if (specs.length === 0) return true; // If no features are specified, then all components match
    if (specs.length > componentFeature.length) return false; // If the specs have more features than the component, then it can't match
    if (specs.length < componentFeature.length) {
      for (const spec of specs) {
        if (!componentFeature.find((feature: IReactoryComponentFeature) => feature.feature === spec.feature && feature.featureType === spec.featureType)) return false;
      }
      return true;
    }
    for (const spec of specs) {
      if (!componentFeature.find((feature: IReactoryComponentFeature) => feature.feature === spec.feature && feature.featureType === spec.featureType)) return false;
    }
    return true;
  }

  private findMatchingComponent<T>(input: Partial<IReactoryComponentDefinition<T>>): IReactoryComponentDefinition<T> | null {
    for (const component of this.modelRegistry) {
      // Match primary fields
      if (input.nameSpace && input.nameSpace !== component.nameSpace) continue;
      if (input.name && input.name !== component.name) continue;
      if (input.version && input.version !== component.version) continue;

      // Match stem using helper function
      if (input.stem && component.stem && !this.compareStem(input.stem, component.stem)) continue;

      // Match features using helper function
      if (input.features && component.features && !this.compareFeatures(input.features, component.features)) continue;

      // If all conditions pass, return the matching component
      return component as IReactoryComponentDefinition<T>;
    }

    // If no matching component found, return null
    return null;
  }
}

export default ReactoryModelRegistry;