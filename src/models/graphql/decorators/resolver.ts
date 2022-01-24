
import { Reactory } from '@reactory/server-core/types/reactory';

export function resolver<T extends { new (...args: any[]): Reactory.IReactoryResolver }>(constructor: T) {
  // return class extends constructor {
  //   resolver: {
  //     Query: {

  //     },
  //     Mutation: {

  //     }
  //   }
  // }

  // debugger

  // constructor.prototype.resolver = {
  //     Query: {},
  //     Mutation: {},
  //     Subscription: {}
  // }
}


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

export function subscription(name: string) {

  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): any => {

    debugger

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
