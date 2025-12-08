import Reactory from '@reactory/reactory-core';


/**
 * Service decorator function, used to decorate a class as a Reactory service.
 * The system will use this decorator to register the service with the system.
 * @param options 
 * @returns 
 */
function service<S extends Reactory.Service.IReactoryService>(options: Partial<Reactory.Service.IReactoryServiceDefinition<T>>) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const reactory: Reactory.Service.IReactoryServiceDefinition<any> = {
      id: options.id,
      nameSpace: options.nameSpace,
      name: options.name,
      version: options.version,  
      description: options.description,
      service: (
        props: Reactory.Service.IReactoryServiceProps,
        context: Reactory.Server.IReactoryContext
      ): S => {
        try {
          const instance: S = new constructor(props, context) as S;
          instance.name = options.name;
          instance.nameSpace = options.nameSpace;
          instance.version = options.version;
          
          
          
          return instance;
        } catch (err) {
          context.error(`Could not instanciate service ${options.id} ${err.message}`);
          return null;
        }
      },
      dependencies: options.dependencies,
      serviceType: options.serviceType,
      lifeCycle: options.lifeCycle || "instance", 
      ...options
    };
    constructor.prototype.reactory = reactory;
    constructor.prototype.COMPONENT_DEFINITION = reactory;
  };
}

export { service };
