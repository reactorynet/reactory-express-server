import Reactory from "@reactory/reactory-core";
import logger from "@reactory/server-core/logging";
import modules from "@reactory/server-core/modules";
import ApiError from "@reactory/server-core/exceptions";

type DependencySetter = <T>(deps: T) => void;

class ServiceManager {
  private services: Reactory.Service.IReactoryServiceDefinition<any>[] = [];
  private serviceRegister: Reactory.Service.IReactoryServiceRegister = {};
  private context: Reactory.Server.IReactoryContext;
  private instances: any = {};
  private static instance: ServiceManager;

  private constructor(context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.getAlias = this.getAlias.bind(this);
    this.getService = this.getService.bind(this);
    this.init = this.init.bind(this);
    this.startServices = this.startServices.bind(this);
    this.stopServices = this.stopServices.bind(this);
    this.listServices = this.listServices.bind(this);
    this.getServices = this.getServices.bind(this);
    this.init();
  }

  static getInstance(context: Reactory.Server.IReactoryContext) {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager(context);
    }

    return ServiceManager.instance;
  }

  init() {
    /**
     * We load the enabled module service details into a map and array.
     */
    modules.enabled.forEach(
      (installedModule: Reactory.Server.IReactoryModule) => {
        const { services, serviceRegister } = this;
        try {
          if (installedModule && installedModule.services) {
            if (installedModule.services) {
              logger.debug(
                `Module ${installedModule.name}: (${installedModule.services.length}) services found.`
              );
              installedModule.services.forEach(
                (
                  serviceDefinition:
                    | Reactory.Service.IReactoryServiceDefinition<any>
                    | any
                ) => {
                  let $service = serviceDefinition;
                  if (
                    typeof $service === "function" &&
                    $service?.prototype?.reactory
                  ) {
                    $service = ($service as any).prototype.reactory;
                  }
                  logger.debug(`🔀 ${$service.id} [${$service.serviceType}]`);
                  services.push($service);
                  serviceRegister[$service.id] = $service;
                }
              );
            }
          } else {
            logger.debug(
              `🟠 Module ${
                installedModule || "NULL-MODULE!"
              } has no services available`
            );
          }
        } catch (serviceInstallError) {
          logger.error(
            `Service install error: ${serviceInstallError.message}`,
            { serviceInstallError }
          );
        }
      }
    );
  }

  getAlias(id: string) {
    const [fullname, _] = id.split('@');
    const [__, name] = fullname.split('.');
  
    return name;
  }
  

  getService(id: string,
    props: any = {},
    context: Reactory.Server.IReactoryContext, 
    lifeCycle: Reactory.Service.SERVICE_LIFECYCLE = "instance"): any  {
    const { serviceRegister, services, getAlias, getService, instances } = this;
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
      
      const request_key = `svc_request::${id}`;
      
      /**
       * Check if the service is in the request context state
       */
      if (context.state[request_key] !== null && context.state[request_key] !== undefined  && lifeCycle === "request") {      
        context.log(`Found Service Instance matching key ${request_key}`, 'debug')
        return context.state[request_key];
      }
  
      /**
       * Check if the service is a singleton which will be for services
       * that are for the entire life period of the service uptime.
       */
      const singleton_key = `svc_instance::${id}`;
      if(instances[singleton_key] && lifeCycle === "singleton") {
        context.log(`Service singleton instance found`);
        return instances[singleton_key];
      }
  
      const svc: Reactory.Service.IReactoryService = serviceRegister[id].service({ ...props, $services: serviceRegister, $dependencies: $deps }, context) as Reactory.Service.IReactoryService;
      //try to auto bind services with property setter binders.
      Object.keys($deps).map((dependcyAlias: string) => {
        let isSet = false;
        if (!isSet) {
          const setterName = `set${dependcyAlias.substring(0, 1).toUpperCase()}${dependcyAlias.substring(1)}`;
          if (((svc as any)?.[setterName] as DependencySetter) &&
           typeof ((svc as any)?.[setterName] as DependencySetter) === "function") {
             try {
              // Call the setter function
              //@ts-ignore
              svc[setterName]($deps[dependcyAlias]);
            } catch (setterError) {
              // if there is an error, we log it and continue
              // we set the dependency on the service object 
              // directly.
              //@ts-ignore
              svc[dependcyAlias] = $deps[dependcyAlias];
              context.warn(`🚨 Setter error ${setterName}; ${setterError?.message ? setterError.message : 'Unknown'} 🚨`, { service_id: id, props, setterError }, 'warning');
            }
          } else {
            // if there is no setter function, we set the dependency on the service object 
            // directly.
            //@ts-ignore
            svc[dependcyAlias] = $deps[dependcyAlias];
          
          }
        }
      });
  
      if (context.state[request_key] === null && context.state[request_key] === undefined  && lifeCycle === "request") {      
        context.log(` 🔥🔥 Setting Request service key ${request_key} 🔥🔥`, { svc: svc }, 'debug')
        context.state[request_key] = svc;
      }
  
      if(lifeCycle === "singleton" && 
        ( 
          null === instances[singleton_key] || 
          undefined === instances[singleton_key]
        )) {
          instances[singleton_key] = svc;
      }
      // ensure that the service has the correct name, namespace and version
      svc.name = svcDef.name;
      svc.nameSpace = svcDef.nameSpace;
      svc.version = svcDef.version;
      return svc;
    } else {
      throw new ApiError(`Service ${id} not found in service registry.`);
    }
  }
  

  async startServices(props: any, context: Reactory.Server.IReactoryContext): Promise<boolean> {   
    const { services, getService } = this;
    try {
      let promises = [];
      for (const service of services) {
        const instance = getService(service.id, props, context);
        if (instance.onStartup && typeof instance.onStartup === 'function') {
          await instance.onStartup(context);
        }
      }
  
      return true;
    } catch (serviceStartupError) {
      logger.error('An error occured while starting some services, please check log for details', serviceStartupError)
      return false;
    }
  }

  async stopServices(props: any, context: any): Promise<boolean> {
    const { services, getService } = this;
    try {
      let startup_promises: Promise<void>[] = []
  
      services.forEach((service: Reactory.Service.IReactoryServiceDefinition<any>) => {
        const instance = getService(service.id, props, context);
  
        if (instance.onShutdown) {
          startup_promises.push((instance as Reactory.Service.IReactoryShutdownAwareService).onShutdown());
        }
      });
  
      await Promise.all(startup_promises).then();
  
      return Promise.resolve(true);
    } catch (serviceStartupError) {
      logger.error('An error occured while shutting down services, please check log for details', serviceStartupError);
      return Promise.resolve(false);
    }
  }

  listServices(filter: Reactory.Server.ReactoryServiceFilter): Reactory.Service.IReactoryServiceDefinition<any>[] {
    const { services } = this;

    let filtered: Reactory.Service.IReactoryServiceDefinition<any>[] = services;
  
    if (filter.id) {
      filtered = filtered.filter((svc: Reactory.Service.IReactoryServiceDefinition<any>) => svc.id === filter.id);
    }
  
    if (filter.name) {
      filtered = filtered.filter((svc: Reactory.Service.IReactoryServiceDefinition<any>) => svc.name === filter.name);
    }
  
    if (filter.type) {
      filtered = filtered.filter((svc: Reactory.Service.IReactoryServiceDefinition<any>) => svc.serviceType === filter.type);
    }
  
    if (filter.lifeCycle) {
      filtered = filtered.filter((svc: Reactory.Service.IReactoryServiceDefinition<any>) => svc.lifeCycle === filter.lifeCycle);
    }
  
    return filtered;
  }

  getServices() {
    return this.services;
  }
}


export default ServiceManager;
