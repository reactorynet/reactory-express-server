import logger from "@reactory/server-core/logging";
import Reactory from "@reactorynet/reactory-core"
import { ClassDeclaration, ClassExpression } from "typescript";


type ReactoryResolverFunc = () => Reactory.Graph.IGraphShape;
type ReactoryResolver = ReactoryResolverFunc | Reactory.Graph.IGraphShape
   | Reactory.Graph.IReactoryResolver;


function isResolverFunc(resolver: ReactoryResolver): resolver is ReactoryResolverFunc {
  return typeof (resolver as ReactoryResolverFunc) === "function";
};

function isResolverObject(resolver: ReactoryResolver): resolver is Reactory.Graph.IGraphShape {
  // Object.keys(null) throws "Cannot convert undefined or null to object", so a
  // single undefined entry in a module's resolver array — a renamed export, a
  // circular import, or a module mocked out in a test — took down the entire
  // registry import instead of being skipped. A type guard must answer, not
  // throw.
  if (resolver === null || resolver === undefined) return false;
  if (typeof resolver !== 'object') return false;
  return Object.keys(resolver as Reactory.Graph.IGraphShape).length > 0;
};

function isResolverClass(resolver: ReactoryResolver): resolver is Reactory.Graph.IGraphShape {
  if (resolver === null || resolver === undefined) return false;
  //@ts-ignore
  if(resolver.prototype && resolver.prototype.constructor && resolver.prototype.resolver ) {
    return true
  }

  return false;
}

export type ResolverType = ReactoryResolverFunc | 
  Reactory.Graph.IGraphShape | 
  Reactory.Graph.IReactoryResolver |
  any;

const MergeGraphResolvers = (resolvers: ResolverType[] = []): Reactory.Graph.IGraphShape => {

  let rootResolver: Reactory.Graph.IGraphShape = {
    Query: {},
    Mutation: {},
    Subscription: {}
  };

  resolvers.forEach((resolver: ReactoryResolver, index: number) => {

    // Report the gap rather than merging nothing in silence: a nullish entry
    // means an export in the module's resolver array did not resolve, and the
    // symptom otherwise is a GraphQL field that is simply absent at runtime.
    if (resolver === null || resolver === undefined) {
      logger.warn(
        `MergeGraphResolvers: resolver at index ${index} is ${resolver === null ? 'null' : 'undefined'} — skipping. ` +
        `Check that every entry in the module's resolver array is exported.`
      );
      return;
    }

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
        // first merge the Query and Mutation entries
        // @ts-ignore
        if (typeof $resolver[property] === 'object') {
          //@ts-ignore
          rootResolver[property] = {
            //@ts-ignore
            ...rootResolver[property],
            //@ts-ignore
            ...$resolver[property]
          };
          //@ts-ignore
          delete $resolver[property];
        }
      });

      rootResolver = { ...rootResolver, ...$resolver };
    }
    
  });

  return rootResolver;
};

export default MergeGraphResolvers;