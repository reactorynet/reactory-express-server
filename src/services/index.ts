

import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';
import ApiError from '@reactory/server-core/exceptions';

/**
 * services array
 */
const services: Reactory.Service.IReactoryServiceDefinition[] = [];
/**
 * services id map
 */
const serviceRegister: Reactory.Service.IReactoryServiceRegister = {}

/**
 * We load the enabled module service details into a map and array.
 */
modules.enabled.forEach((installedModule: Reactory.Server.IReactoryModule) => {
  /**
      "id": "0c22819f-bca0-4947-b662-9190063c8277",
      "name": "Lasec",
      "key": "lasec",
      "fqn": "lasec.LasecCRM@1.0.0",
      "moduleEntry": "./lasec-crm/index.js",
      "license": "commercial",
      "shop": "https://reactory.net/shop/modules/0c22819f-bca0-4947-b662-9190063c8277/"
   */
  try {
    if (installedModule && installedModule.services) {
      if (installedModule.services) {
        logger.debug(`🟢 Module ${installedModule.name} has ${installedModule.services.length} services available`)
        installedModule.services.forEach((serviceDefinition: Reactory.Service.IReactoryServiceDefinition | any) => {
          let $service = serviceDefinition;
          if (typeof $service === 'function' && $service?.prototype?.reactory) {
            $service = ($service as any).prototype.reactory;
          }
          logger.debug(`  🔀 ${$service.id} [${$service.serviceType}]`);
          services.push($service);
          serviceRegister[$service.id] = $service
        });

      }
    } else {
      logger.debug(`🟠 Module ${installedModule || 'NULL-MODULE!'} has no services available`);
    }
  } catch (serviceInstallError) {
    logger.error(`Service install error: ${serviceInstallError.message}`, { serviceInstallError });
  }
});

const getAlias = (id: string) => {
  const [fullname, version] = id.split('@');
  const [nameSpace, name] = fullname.split('.');

  return name;
}

/**
 * Returns a service based on the service id and injects any properties required into the service.
 * @param id - The string id
 * @param props - The props we want to pass to the service.
 * @param context - The request context that needs to be passed to te service.
 * @param lifeCycle - The service life cycle we want to use for this service.
 * @returns 
 */
export const getService = (id: string,
  props: any = {},
  context: Reactory.Server.IReactoryContext, 
  lifeCycle: Reactory.Service.SERVICE_LIFECYCLE = "instance"): any => {

  if (serviceRegister[id]) {
    const svcDef = serviceRegister[id];
    let $deps: any = {}; //holder for the dependencies.

    /**
     * Internal helper function to append our dependencies for this service.
     * @param dep 
     */
    const append_deps = (dep: string | { alias: string, id: string }) => {
      let alias = null;
      let $id: string | { alias: string, id: string } = dep;

      if (typeof dep === "string") {
        alias = getAlias(dep as string)
        $id = dep as string
      }

      if (typeof dep === 'object') {
        if (dep.alias) alias = dep.alias;
        if (dep.id) $id = dep.id;

      }

      const hasIt = serviceRegister[$id as string] !== undefined;
      if (hasIt === true) {
        $deps[alias] = getService($id as string, props, context,);
      } else {
        context.log(`🚨 Dependency not found ${dep} 🚨`, { service_id: id, props, missing: dep }, 'warning');
      }
    }

    if (svcDef.dependencies && svcDef.dependencies.length > 0) {
      svcDef.dependencies.forEach((dep) => {
        append_deps(dep);
      })
    }
    
    const singleton_key = `svc_instance::${id}`;
    
    if (context.state[singleton_key] !== null && context.state[singleton_key] !== undefined  && lifeCycle === "singleton") {      
      let $svc = context.state[singleton_key];
      context.log(` 🔥🔥 Found Service Instance matching key ${singleton_key} 🔥🔥`, { svc: $svc }, 'debug')
      return context.state[singleton_key];
    }

    const svc = serviceRegister[id].service({ ...props, $services: serviceRegister, $dependencies: $deps }, context);
    //try to auto bind services with property setter binders.
    Object.keys($deps).map((dependcyAlias: string) => {
      let isSet = false;
      if (!isSet) {
        let fn = `set${dependcyAlias.substring(0, 1).toUpperCase()}${dependcyAlias.substring(1, dependcyAlias.length)}`;
        if (svc[fn] && typeof svc[fn] === 'function') {
          //call the setter function
          svc[fn]($deps[dependcyAlias]);
        }
      }
    });

    if (context.state[singleton_key] === null && context.state[singleton_key] === undefined  && lifeCycle === "singleton") {      
      context.log(` 🔥🔥 Setting Singleton service key ${singleton_key} 🔥🔥`, { svc: svc }, 'debug')
      context.state[singleton_key] = svc;
    }

    return svc;
  } else {
    throw new ApiError(`Could not get service ${id}`);
  }
}

/**
 * Used to initiate services at start of application that requires some pre-loading management.
 * Use cases here may be to check if other systems are online or fetch new remote configuration data.
 * Services that expose the onStart method will be executed.
 * @param props 
 * @param context 
 * @returns 
 */
export const startServices = async (props: any, context: any): Promise<boolean> => {

  try {
    let startup_promises: Promise<boolean>[] = []

    services.forEach((service: Reactory.Service.IReactoryServiceDefinition) => {
      const instance = getService(service.id, props, context);

      if (instance.onStartup) {
        startup_promises.push((instance as Reactory.Service.IReactoryStartupAwareService).onStartup());
      }

    });

    let resuts = await Promise.all(startup_promises).then();

    return Promise.resolve(true);
  } catch (serviceStartupError) {
    logger.error('An error occured while starting some services, please check log for details', serviceStartupError)
    return Promise.resolve(false);
  }
};

/**
 * Stops the services that expose the onStop function. This is useful for services that need to send 
 * a pre-shutdown notification to other system.
 * @param props 
 * @param context 
 * @returns 
 */
export const stopServices = async (props: any, context: any): Promise<boolean> => {

  try {
    let startup_promises: Promise<boolean>[] = []

    services.forEach((service: Reactory.Service.IReactoryServiceDefinition) => {
      const instance = getService(service.id, props, context);

      if (instance.onShutdown) {
        startup_promises.push((instance as Reactory.Service.IReactoryShutdownAwareService).onShutdown());
      }
    });

    let resuts = await Promise.all(startup_promises).then();

    return Promise.resolve(true);
  } catch (serviceStartupError) {
    logger.error('An error occured while shutting down services, please check log for details', serviceStartupError);
    return Promise.resolve(false);
  }
};

export default services;
