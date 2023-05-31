
import Reactory from '@reactory/reactory-core';

/**
 * The resolver decorator simply acts as a flag for the Reactory
 * Server to use this class object as a resolver, instead of 
 * @param constructor 
 */
export function resolver(): void {
  //does nothing, we simply use it to flag Resovler classes.
}

/**
 * Property decorator wires a function up to a graph Object property.
 * This means given the graph element:
 * ```
 * type Foo {
 *   bar: String!
 * }
 * ```
 * We can wire a class function as a property for element Foo
 * ```
 * \@resolver
 * class Foo {
 *  resolver: any
 * \@property("Foo", "bar")
 *  bar(objFoo: FooType, args, context ..){
 *    return "bar string"
 *  }
 * }
 * ```
 * @param objectKey - the name of the object that this property is bound to. i.e. Foo
 * @param property - the name of the property that this function will be wired to. i.e. bar
 * @returns the original descriptor of the function, wires the resolver variable, which is injected
 * into the global resolver structure.
 */
export function property(objectKey: string, property: string) {

  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): any => {
    
    if(target) {
      if(!target.resolver) {
        target.resolver = {
          Query: {},
          Mutation: {},
          Subscription: {}
        }
      }

      if (!target.resolver.Query) target.resolver.Query = {};
      if (!target.resolver.Mutation) target.resolver.Mutation = {};

      if(objectKey === "Query") {
        target.resolver.Query[property] = target[propertyKey];
      }

      if(objectKey === "Mutation") {
        target.resolver.Mutation[property] = target[propertyKey];
      }

      if(objectKey === "Subscription") {
        target.resolver.Subscription[property] = target[propertyKey];
      }

      if(objectKey !== "Query" && objectKey !== "Mutation" && objectKey !== "Subscription") {
        if(!target.resolver[objectKey]) target.resolver[objectKey] = {};
        target.resolver[objectKey][property] = target[propertyKey];
      }
      
    }

    return descriptor;

  }

}

/**
 * Marks a class function as a graph Query element.
 * ```
 * Query {
 *  ListMyFoos: [Foo]
 *  ...
 * }
 * ```
 * 
 * We can wire a class function as a query for graph query element ListMyFoos
 * ```
 * \@resolver
 * class Foo {
 *  resolver: any
 * \@query("ListMyFoos")
 *  async getUserFoos(_, args, context ..){
      const fooService = context.getService('FooService');
      return fooService.getUserFoos()
 *  }
 * }
 * ```
 * @param name - The name of the graph Query element
 * @returns the original descriptor of the function, wires the resolver variable, which is injected
 * into the global resolver structure.
 */
export function query(name: string) {

  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): any => {    
    if (target) {
      if (!target.resolver) {
        target.resolver = {
          Query: {},
          Mutation: {},
          Subscription: {}
        }
      }

      if (!target.Query) target.Query = {};

      target.resolver.Query[name] = target[propertyKey];

    }
    return descriptor;
  }
}

/**
 * Marks a class function as a graph Mutation element.
 * ```
 * Mutation {
 *  UodateFoo(fooData: FooInput): Foo
 *  ...
 * }
 * ```
 * 
 * We can wire a class function as a query for graph query element ListMyFoos
 * ```
 * \@resolver
 * class Foo {
 *  resolver: any
 * \@mutation("UpdateFoo")
 *  async updateFoo(_, args, context ..){
      const fooService = context.getService('FooService');
      return fooService.updateFoo(args.fooData);
 *  }
 * }
 * ```
 * @param name - The name of the graph Mutation element
 * @returns the original descriptor of the function, wires the resolver variable, which is injected
 * into the global resolver structure.
 */
export function mutation(name: string) {

  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): any => {
    if (target) {
      if (!target.resolver) {
        target.resolver = {
          Query: {},
          Mutation: {},
          Subscription: {}
        }
      }

      if (!target.Mutation) target.Mutation = {};

      target.resolver.Mutation[name] = target[propertyKey];
    }

    return descriptor;

  }

}

/**
 * Marks a class function as a graph Subscription element.
 * ```
 * Subscription {
 *  fooUpdated(fooId: String!): Foo
 *  ...
 * }
 * ```
 * 
 * We can wire a class function as a query for graph query element ListMyFoos
 * ```
 * \@resolver
 * class Foo {
 *  resolver: any
 * \@subscription("fooUpdate")
 *  async subscribe(_, args, context ..){
      const pubsub = context.pubsub;
      return pubsub.asyncIterator('fooUpdate')
 *  }
 * }
 * ```
 * @param name - The name of the graph Mutation element
 * @returns the original descriptor of the function, wires the resolver variable, which is injected
 * into the global resolver structure.
 */
export function subscription(name: string) {

  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): any => {

    if (target) {
      if (!target.resolver) {
        target.resolver = {
          Query: {},
          Mutation: {},
          Subscription: {}
        }
      }

      if (!target.Subscription) target.Subscription = {};

      target.resolver.Subscription[name] = target[propertyKey];
    }

    return descriptor;

  }

}
