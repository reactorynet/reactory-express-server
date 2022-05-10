import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';
import lodash from 'lodash';
import ApiError, { UserNotFoundException, InsufficientPermissions } from '@reactory/server-core/exceptions';
export function roles(allowedRoles: string[], contextKey: string = 'this.context') {  
  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): any => {    


    let original = descriptor.value;

    descriptor.value = function( ){
     
     
      let passed: boolean;      
      let context: Reactory.Server.IReactoryContext
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

      passed = false;
      if(context === null || context === undefined) throw new ApiError(`Could not extract the context for the execution to determine roles`, { allowedRoles, contextKey })
      
      context.log(`${propertyKey.toString()} is executing`, { target, propertyKey, descriptor }, 'debug', '@roles()')
      if (context.user === null) throw new UserNotFoundException('no user available on context', {});

      allowedRoles.forEach((role) => {
        if(role.indexOf("${") >= 0) {
          try {
            const hasExpression = lodash.template(role, {})({ target, context, descriptor, arguments }) === "true"
            if(hasExpression === true && passed === false) passed = true;                        
          } catch(e) {}
        } else {
          if (context.hasRole(role) === true) {
            passed = true;
          }
        }        
      });
      
      //@ts-ignore
      if (passed === true) return original.apply(this, arguments);
      else throw new InsufficientPermissions("User does not have permissions to execute this function")
    }

    return descriptor;
  }
}

export default {
  roles
}