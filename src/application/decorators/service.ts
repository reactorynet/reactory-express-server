import Reactory from '@reactory/reactory-core';

/**
 * Service decorator function, used to decorate a class as a Reactory service.
 * The system will use this decorator to register the service with the system.
 * 
 * This is the alternative approach to adding a static reactory property to the class.
 * @param options 
 * @returns 
 */
function service<S extends Reactory.Service.IReactoryService>(options:  Reactory.Service.ServiceAnnotationOptions<S>) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const reactory: Reactory.Service.IReactoryServiceDefinition<any> = {
      id: options?.id || `${options.nameSpace}.${options.name}@${options.version}`,
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
