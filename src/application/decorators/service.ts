import Reactory from '@reactory/reactory-core';

type ServiceOptions = {
  id: string;
  name?: string;
  description?: string;
  dependencies?: Array<{ id: string; alias: string }>;
  serviceType?: Reactory.Service.ReactoryServiceTypes;
};

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
