

import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';
import ApiError from 'exceptions';

const services: Reactory.IReactoryServiceDefinition[] = [];
const serviceRegister: Reactory.IReactoryServiceRegister = {

}

const getAlias = (id: string) => {



  const [fullname, version] = id.split('@');
  const [nameSpace, name] = fullname.split('.');

  return name;
}

export const getService = (id: string, props: any = {}, context: Reactory.IReactoryContext, lifeCycle: Reactory.SERVICE_LIFECYCLE = "instance"): any => {

  if (serviceRegister[id]) {
    const svcDef = serviceRegister[id];
    let $deps: any = {}; //holder for the dependencies.


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
      debugger
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

modules.enabled.forEach((installedModule: Reactory.IReactoryModule) => {
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
        installedModule.services.forEach((serviceDefinition: Reactory.IReactoryServiceDefinition) => {
          logger.debug(`🔀 Loading Service ${serviceDefinition.name}: ${installedModule.name}`);
          services.push(serviceDefinition);
          serviceRegister[serviceDefinition.id] = serviceDefinition
        });

      }
    } else {
      logger.debug(`🟠 Module ${installedModule || 'NULL-MODULE!'} has no services available`)
    }
  } catch (serviceInstallError) {
    logger.error(`Service install error: ${serviceInstallError.message}`, { serviceInstallError });
  }
});



export const startServices = async (props: any, context: any): Promise<boolean> => {

  try {
    let startup_promises: Promise<boolean>[] = []

    services.forEach((service: Reactory.IReactoryServiceDefinition) => {
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

export const stopServices = async (props: any, context: any): Promise<boolean> => {

  try {
    let startup_promises: Promise<boolean>[] = []

    services.forEach((service: Reactory.IReactoryServiceDefinition) => {
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
