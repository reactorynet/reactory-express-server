import Reactory from '@reactory/reactory-core';


/**
 * Service decorator function, used to decorate a class as a Reactory service.
 * The system will use this decorator to register the service with the system.
 * @param options 
 * @returns 
 */
function service(options: Partial<Reactory.Service.IReactoryServiceDefinition<any>>) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const reactory: Reactory.Service.IReactoryServiceDefinition<T> = {
      id: options.id,
      nameSpace: options.nameSpace,
      name: options.name,
      version: options.version,  
      description: options.description,
      service: (
        props: Reactory.Service.IReactoryServiceProps,
        context: Reactory.Server.IReactoryContext
      ): T => {
        return new constructor(props, context) as T; 
      },
      dependencies: options.dependencies,
      serviceType: options.serviceType,
      lifeCycle: options.lifeCycle || "instance", 
      ...options
    };
    constructor.prototype.reactory = reactory;
  };
}

export { service };
