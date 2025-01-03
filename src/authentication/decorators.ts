import Reactory from '@reactory/reactory-core';
import lodash from 'lodash';
import ApiError, { UserNotFoundException, InsufficientPermissions } from '@reactory/server-core/exceptions';

/**
 * Roles decorator is used to inspect a particular execution block to see whether
 * or not the logged in user has the role(s) required to access the function block.
 * @param allowedRoles - string array of roles that are permitted to access a code bloc
 * @param contextKey - a context provider, the default is this.context, which tells the decorator 
 * to look at the this object for the context element, other 
 * @returns 
 */
export function roles(allowedRoles: string[], 
  contextKey: 'this.context' | 'args.context' = 'this.context') {  
  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): any => {    
    let original = descriptor.value;
    descriptor.value = function( ){      
      let passed: boolean = false;      
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
      
      if(context === null || context === undefined) throw new ApiError(`Could not extract the context for the execution to determine roles`, { allowedRoles, contextKey })            
      if (context.user === null) throw new UserNotFoundException('no user available on context', {});
      allowedRoles.forEach((role) => {
        if(role.indexOf("${") >= 0) {
          try {
            const hasExpression = lodash.template(role, {})({ target, context, descriptor, arguments }) === "true"
            if(hasExpression === true && passed === false) passed = true;                        
          } catch(e) {}
        } else if (context.hasRole(role) === true) {
          passed = true;
        }        
      });
      
      if (passed) return original.apply(this, arguments);
      else throw new InsufficientPermissions(`User [${context.user._id.toString()}] does not have permissions to execute ${propertyKey.toString()}`, { allowedRoles, contextKey })
    }

    return descriptor;
  }
}

export default {
  roles
}