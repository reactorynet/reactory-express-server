import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'

const getComponentWithFqn = async (fqn: string) => {
  const parts = fqn.split('@');
  const v = parts[1];
  const ns = parts[0].split('.')[0];
  const nm = parts[0].split('.')[1];

  return ClientComponent.find({ nameSpace: ns, name: nm, version: v }).clone();
};


@resolver
export class ReactoryClientResolver {
  resolver: any

  @property("ReactoryClient", "id")
  id(obj: any) {
    if(obj) return obj._id.toString();
    if(obj.id) return obj.id
    return null;
  }

  @property("ReactoryClient", "users")
  async users(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const userService = context.getService<Reactory.Service.IReactoryUserService>("core.UserService@1.0.0");
    const clientId = obj._id || obj.id;
    return userService.getUsersByClientMembership(clientId, args.paging);
  }
  
  @roles(["ADMIN"])
  @query("ReactoryClientWithId")
  async clientWithId(obj: any, arg: any, context: Reactory.Server.IReactoryContext) {
      const systemService = context.getService<Reactory.Service.IReactorySystemService>("core.SystemService@1.0.0");
      return systemService.getReactoryClient(arg.id);
  }

  @roles(["ADMIN"])
  @query("ReactoryClientApplicationUsers")
  async clientApplicationUsers(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { clientId, filter, paging } = args;
    const userService = context.getService<Reactory.Service.IReactoryUserService>("core.UserService@1.0.0");
    return userService.getUsersByClientMembership(clientId, paging);
  }
}

@resolver
export class ClientComponentResolver {
  resolver: any

  async author(component: any, args: any, context: Reactory.Server.IReactoryContext){
    const { author = null } = component;
    if(author === null) return null;
    const userService: Reactory.Service.IReactoryUserService = context.getService("core.UserService@1.0.0");
    return userService.findUserById(component.author)
  }
}

@resolver
export class ClientRouteResolver {
  resolver: any

  component(route: any){
    if(!route.componentFqn) {
      return {
        nameSpace: 'core',
        name: 'EmptyComponent',
        version: '1.0.0',
        title: `Component for Route ${route.path} not defined, check settings`,
      };
    }

    return getComponentWithFqn(route.componentFqn);
  }
}
