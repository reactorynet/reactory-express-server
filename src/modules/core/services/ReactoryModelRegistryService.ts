import {
  Service,
  Server,
  IReactoryComponentDefinition,
  IReactoryComponentFeature,
} from "@reactory/reactory-core"; // import necessary types
import { service } from "@reactory/server-core/application/decorators/service";

@service({
  id: "core.ReactoryModelRegistry@1.0.0",
  nameSpace: "core",
  name: "ReactoryModelRegistry",
  version: "1.0.0",
  description: "Provides registry features for any reactory model",
  serviceType: "data",
  lifeCycle: "singleton",  
  dependencies: [
    { id: "core.FetchService@1.0.0", alias: "fetchService" },
    { id: "core.ReactoryFileService@1.0.0", alias: "fileService" },
  ],
})
export class ReactoryModelRegistry
  implements Reactory.Service.TReactoryModelRegistryService
{
  name: string = "core";
  nameSpace: string = "ReactoryModelRegistry";
  version: string = "1.0.0";
  context: Server.IReactoryContext;

  private instance: ReactoryModelRegistry = undefined; 

  private modelRegistry: IReactoryComponentDefinition<unknown>[] = [];
  private replacedModels: IReactoryComponentDefinition<unknown>[] = [];

  private fetchService: Reactory.Service.IFetchService;
  private fileService: Reactory.Service.IReactoryFileService;

  constructor(
    props: Service.IReactoryServiceProps,
    context: Server.IReactoryContext
  ) {
    if(!ReactoryModelRegistry.instance) {
      this.context = context;
      ReactoryModelRegistry.instance = this;
    }
    
    return ReactoryModelRegistry.instance;
  }

  description?: string;
  tags?: string[];
  toString: ((includeVersion?: boolean) => string) & (() => string);

  onStartup(): Promise<void> {
    // load all models that are registered with the module in
    const that = this;
    if(this.context && Array.isArray(this.context?.modules) === true) {
      this.context.modules.forEach((module) => {
        module?.models?.forEach((model) => {
          that.register(model);
        });
      });     
    }
    
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

  register<T>(
    model: IReactoryComponentDefinition<T>,
    overwrite: boolean = false
  ): void {
    if (
      this.modelRegistry.find(
        (m) =>
          m.name === model.name &&
          m.nameSpace === model.nameSpace &&
          m.version === model.version
      )
    ) {
      if (overwrite) {
        this.modelRegistry.splice(
          this.modelRegistry.findIndex((m) => m.name === model.name),
          1
        );
        this.replacedModels.push(model);
      } else {
        throw new Error(
          `Model ${model.name} already exists. Use overwrite flag to overwrite.`
        );
      }
    }
    this.modelRegistry.push(model);
  }

  getModel<T>(specs: Partial<IReactoryComponentDefinition<T>>): T | null {
    const result = this.findMatchingComponent(specs);
    if (result === null) return null;
    return (result as IReactoryComponentDefinition<T>).component as T;
  }

  getModels<T>(spec: Partial<IReactoryComponentDefinition<T>>): T[] {
    //find all models where we have a partial match to the spec
    let allModels: IReactoryComponentDefinition<T>[] = [];
    this.context.modules.forEach((reactoryModule) => {
      const { models = [] } = reactoryModule;
      //@ts-ignore
      allModels.push(...models);
    });

    if (spec.name) {
      if(spec.name.indexOf('*') === -1 && spec?.name.length > 0) {
        for(let i = allModels.length - 1; i >= 0; i--) {
          if(allModels[i].name !== spec.name) {
            allModels.pop();
          }
        }
      } else {
        // partial match
        allModels = allModels.filter((model) => { 
          if(spec.name.endsWith('*')) { 
            return model.name.toLowerCase().startsWith(spec.name.slice(0, spec.name.length - 1));
          }

          if(spec.name.startsWith('*')) { 
            return model.name.toLowerCase().endsWith(spec.name.slice(1));
          }

          if(spec.name.toLowerCase().indexOf('*') > -1) { 
            const [start, end] = spec.name.split('*');
            return model.name.startsWith(start) && model.name.endsWith(end);
          }
        });
      }
    }

    return allModels.map((model) => model.component as T) ;
  }

  generate<T>(spec: Partial<IReactoryComponentDefinition<T>>): T {
    // Implement logic to generate a model object based on spec
    return ({} as IReactoryComponentDefinition<T>).component as T;
  }

  private compareStem(
    stemA: string,
    stemB: string,
    threshold: number = 0.8
  ): boolean {
    return stemA === stemB;
  }

  private compareFeatures(
    specs: IReactoryComponentFeature[],
    componentFeature: IReactoryComponentFeature[],
    threshold: number = 0.8
  ): boolean {
    if (componentFeature.length === 0) return true;
    if (specs.length === 0) return true; // If no features are specified, then all components match
    if (specs.length > componentFeature.length) return false; // If the specs have more features than the component, then it can't match
    if (specs.length < componentFeature.length) {
      for (const spec of specs) {
        if (
          !componentFeature.find(
            (feature: IReactoryComponentFeature) =>
              feature.feature === spec.feature &&
              feature.featureType === spec.featureType
          )
        )
          return false;
      }
      return true;
    }
    for (const spec of specs) {
      if (
        !componentFeature.find(
          (feature: IReactoryComponentFeature) =>
            feature.feature === spec.feature &&
            feature.featureType === spec.featureType
        )
      )
        return false;
    }
    return true;
  }

  private findMatchingComponent<T>(
    input: Partial<IReactoryComponentDefinition<T>>
  ): IReactoryComponentDefinition<T> | null {
    for (const component of this.modelRegistry) {
      // Match primary fields
      if (input.nameSpace && input.nameSpace !== component.nameSpace) continue;
      if (input.name && input.name !== component.name) continue;
      if (input.version && input.version !== component.version) continue;

      // Match stem using helper function
      if (
        input.stem &&
        component.stem &&
        !this.compareStem(input.stem, component.stem)
      )
        continue;

      // Match features using helper function
      if (
        input.features &&
        component.features &&
        !this.compareFeatures(input.features, component.features)
      )
        continue;

      // If all conditions pass, return the matching component
      return component as IReactoryComponentDefinition<T>;
    }

    // If no matching component found, return null
    return null;
  }
}

export default ReactoryModelRegistry;
