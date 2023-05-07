import { objectMapper } from '@reactory/server-core/utils';

type Injectable = string | { 
  id: string; 
  alias: string, 
  props?: any,
  propsMap?: Reactory.ObjectMap, 
  lifeCycle?: Reactory.Service.SERVICE_LIFECYCLE 
};

function inject(services: Injectable[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      parent: any,
      params: any,
      context: Reactory.Server.IReactoryContext,
      info: any
    ) {
      const instancesMap: { [key: string]: any } = {};

      for (const service of services) {
        const id = typeof service === 'string' ? service : service.id;
        let props = typeof service === 'string' ? undefined : service.props;
        if(typeof service === 'object' && service.propsMap) {
          let $mappedProps = objectMapper.merge(service.propsMap, { parent, params, context, info }, props);
          if($mappedProps && Object.keys($mappedProps).length > 0 && Object.keys(props).length > 0) { 
            props = {
              ...props,
              ...$mappedProps
            }
          }
        }
        const lifeCycle = typeof service === 'string' ? undefined : service.lifeCycle;
        const instance = context.getService(id, props, context, lifeCycle);
        const name = typeof service === 'string' ? getServiceName(id) : service.alias;
        instancesMap[name] = instance;
      }

      return originalMethod.call(this, parent, params, context, info, instancesMap);
    };

    return descriptor;
  };
}

function getServiceName(id: string): string {
  const [, name] = id.split('.');
  const [serviceName] = name.split('@');
  return camelCase(serviceName);
}

function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

export { inject };
