import logger from '@reactory/server-core/logging';
import { Reactory } from '@reactory/server-core/types/reactory';
import ApiError, { UserNotFoundException, InsufficientPermissions } from '@reactory/server-core/exceptions';
export function roles(allowedRoles: string[], contextKey: string = 'this.context') {  
  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): any => {    


    let original = descriptor.value;

    descriptor.value = function( ){
     
     logger.debug(`${propertyKey.toString()} is executing`, { target, propertyKey, descriptor})
      let passed: boolean = false;
      debugger
      let context: Reactory.IReactoryContext
      switch(contextKey) {
        case "this.context": {
          if (this && this.context) {
            context = this.context;
          } else {
            throw new ApiError(`target.context does not exist on parent for ${propertyKey.toString()}`)
          }

          break;
        }
        case "args.context": {
          context = arguments[2];
          break;
        }
      }
      

      if (context.user === null) throw new UserNotFoundException('no user available on context', {});

      allowedRoles.forEach((role) => {
        if (context.hasRole(role) === true) {
          passed = true;
        }
      });

      if (passed === true) return original.apply(this, arguments);
      else throw new InsufficientPermissions("User does not have permissions to execute this function")
    }

    return descriptor;
  }
}

export default {
  roles
}