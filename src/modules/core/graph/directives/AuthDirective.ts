import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import Reactory from "@reactory/reactory-core";
import { GraphQLSchema } from "graphql";

const authDirective = (schema: GraphQLSchema): GraphQLSchema => {

  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {

      const authDirective: Record<string, any> = getDirective(schema, fieldConfig, 'auth')?.[0];

      if(authDirective) {
        return {
          ...fieldConfig,
          resolve: async function(source: any, args: any, context: Reactory.Server.IReactoryContext, info: any) {

            let roles: string[] = authDirective['roles'] || ["USER"];
            let hasPermission: Boolean = false;
            
            if(roles.length > 0) {
              roles.forEach((role)=>{
                if(hasPermission === false) {
                  hasPermission = context.hasRole(role) === true;
                }
              })
            }

            if(hasPermission === true) {
              return await authDirective.defaultFieldResolver(source, args, context, info);
            } else {
              return null;
            }
          }
        }
      }

    }
  })

};

const authDirectiveProvider: Reactory.Graph.IGraphDirectiveProvider = {
  name: 'auth',
  transformer: authDirective 
};

export default authDirectiveProvider;