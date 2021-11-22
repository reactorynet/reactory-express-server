import logger from "@reactory/server-core/logging";
import { Reactory } from "@reactory/server-core/types/reactory";
import { response } from "express";
import ReactoryContent from "modules/core/resolvers/ReactoryContent";


type ReactoryResolverFunc = () => Reactory.IResolverStruct;
type ReactoryResolver = ReactoryResolverFunc | Reactory.IResolverStruct
   | Reactory.IReactoryResolver;


function isResolverFunc(resolver: ReactoryResolver): resolver is ReactoryResolverFunc {
  return typeof (resolver as ReactoryResolverFunc) === "function";
};

function isResolverObject(resolver: ReactoryResolver): resolver is Reactory.IResolverStruct {
  let $resolver = resolver as Reactory.IResolverStruct;
  return Object.keys($resolver).length > 0
};

function isResolverClass(resolver: ReactoryResolver): resolver is Reactory.IReactoryResolver {
  //@ts-ignore
  if(resolver.prototype && resolver.prototype.constructor && resolver.prototype.resolver ) {
    return true
  } 
  
  return false;
}


const MergeGraphResolvers = (resolvers: ReactoryResolver[] = []): Reactory.IResolverStruct => {

  let rootResolver: Reactory.IResolverStruct = {
    Query: {},
    Mutation: {},
    Subscription: {}
  };

  resolvers.forEach((resolver: ReactoryResolver) => {
    let $resolver: Reactory.IResolverStruct = {
      Query: {},
      Mutation: {},
      Subscription: {},
    };

    if (isResolverFunc(resolver) === true) {
      if (isResolverClass(resolver) === true) {
        //@ts-ignore
        let instance = Object.create(resolver.prototype);
        $resolver = instance.resolver;
      } else {
        try {
          $resolver = (resolver as ReactoryResolverFunc)();
        } catch (e) {
          logger.debug(`Could not get the resolver struct from the function`);
        }
      }      
    }


    if (isResolverObject(resolver) === true) {
      $resolver = (resolver as Reactory.IResolverStruct);
    }

    if(Object.keys($resolver).length > 0 ) {
      ['Query', 'Mutation', 'Subscription'].forEach((property: string) => {

        // firt merge the Query and Mutation entries
        if (typeof $resolver[property] === 'object') {
          rootResolver[property] = {
            ...rootResolver[property],
            ...$resolver[property]
          };
          delete $resolver[property];
        }
      });

      rootResolver = { ...rootResolver, ...$resolver };
    }
    
  });

  return rootResolver;
};

export default MergeGraphResolvers;