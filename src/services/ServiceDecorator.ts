import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';
import ApiError, { UserNotFoundException, InsufficientPermissions } from '@reactory/server-core/exceptions';

export function reactoryService<T>(
   
  id: string, 
  name: string, 
  description: string,
  dependencies: Reactory.ReactoryServiceDependencies,
  serviceType: Reactory.ReactoryServiceTypes
  ) {


  return function (constructor: any) {
    constructor.prototype.reactory = {
      id,
      description,
      name,
      service: (props: any, context: Reactory.Server.IReactoryContext) => {
        debugger
        return constructor(props, context);
      },
      dependencies,
      serviceType
    }
  }
}

export default {
  reactoryService
}