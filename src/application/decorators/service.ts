import Reactory from '@reactory/reactory-core';

/**
 *Service options type definition for the service decorator.
 */
type ServiceOptions = {
  /**
   * The full qualified name of the service.
   */
  id: Reactory.FQN;
  /**
   * A human friendly name for the service
   */
  name?: string;
  /**
   * A service description
   */
  description?: string;
  /**
   * The service dependencies
   */
  dependencies?: Array<{ id: string; alias: string }>;
  /**
   * The service type
   */
  serviceType?: Reactory.Service.ReactoryServiceTypes;
};

/**
 * Service decorator function, used to decorate a class as a Reactory service.
 * The system will use this decorator to register the service with the system.
 * @param options 
 * @returns 
 */
function service(options: ServiceOptions) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const reactory: Reactory.Service.IReactoryServiceDefinition = {
      id: options.id,
      name: options.name,
      description: options.description,
      service: (
        props: Reactory.Service.IReactoryServiceProps,
        context: Reactory.Server.IReactoryContext
      ) => {
        return new constructor(props, context);
      },
      dependencies: options.dependencies,
      serviceType: options.serviceType,
    };

    constructor.prototype.reactory = reactory;
  };
}

export { service };
