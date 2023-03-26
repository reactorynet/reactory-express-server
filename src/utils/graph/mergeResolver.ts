import logger from "@reactory/server-core/logging";
import Reactory from "@reactory/reactory-core"


type ReactoryResolverFunc = () => Reactory.Graph.IGraphShape;
type ReactoryResolver = ReactoryResolverFunc | Reactory.Graph.IGraphShape
   | Reactory.Graph.IReactoryResolver;


function isResolverFunc(resolver: ReactoryResolver): resolver is ReactoryResolverFunc {
  return typeof (resolver as ReactoryResolverFunc) === "function";
};

function isResolverObject(resolver: ReactoryResolver): resolver is Reactory.Graph.IGraphShape {
  let $resolver = resolver as Reactory.Graph.IGraphShape;
  return Object.keys($resolver).length > 0
};

function isResolverClass(resolver: ReactoryResolver): resolver is Reactory.Graph.IGraphShape {
  //@ts-ignore
  if(resolver.prototype && resolver.prototype.constructor && resolver.prototype.resolver ) {
    return true
  } 
  
  return false;
}


const MergeGraphResolvers = (resolvers: ReactoryResolver[] = []): Reactory.Graph.IGraphShape => {

  let rootResolver: Reactory.Graph.IGraphShape = {
    Query: {},
    Mutation: {},
    Subscription: {}
  };

  resolvers.forEach((resolver: ReactoryResolver) => {
    let $resolver: Reactory.Graph.IGraphShape = {
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
      $resolver = (resolver as Reactory.Graph.IGraphShape);
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