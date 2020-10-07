

import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';

const services: Reactory.IReactoryServiceDefinition[] = [];
const serviceRegister: Reactory.IReactoryServiceRegister = {

}

modules.enabled.forEach((installedModule: Reactory.IReactoryModule) => {
  /**
      "id": "0c22819f-bca0-4947-b662-9190063c8277",
      "name": "Lasec",
      "key": "lasec",
      "fqn": "lasec.LasecCRM@1.0.0",
      "moduleEntry": "./lasec/index.js",
      "license": "commercial",
      "shop": "https://reactory.net/shop/modules/0c22819f-bca0-4947-b662-9190063c8277/"
   */
  if (installedModule.services) {
    if (installedModule.services) {
      installedModule.services.forEach((serviceDefinition: Reactory.IReactoryServiceDefinition) => {
        logger.debug(`🔀 Loading Service ${serviceDefinition.name}: ${installedModule.name}`);
        services.push(serviceDefinition);
        serviceRegister[serviceDefinition.id] = serviceDefinition
      });
    }

  }
});

export const getService = (id: string, props: any = {}, context: any = {}): any => {
  if (serviceRegister[id]) {
    return serviceRegister[id].service({ ...props, $services: serviceRegister }, context);
  }
}

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
