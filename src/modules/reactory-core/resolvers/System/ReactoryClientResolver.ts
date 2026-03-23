import Reactory from '@reactorynet/reactory-core';
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

    @property("ReactoryClient", "menus")
    menus(partner: Reactory.Models.ReactoryClientDocument, __: any, context: Reactory.Server.IReactoryContext): Promise<Reactory.UX.IReactoryMenuConfig[]> {
      const systemService = context.getService("core.SystemService@1.0.0") as Reactory.Service.IReactorySystemService;
      return systemService.getMenusForClient(partner)    
    };

  @property("ReactoryClient", "featureFlags")
  featureFlags(partner: Reactory.Models.ReactoryClientDocument, __: any, context: Reactory.Server.IReactoryContext): Reactory.Server.IReactoryFeatureFlagValue<unknown>[] {
    // Return the feature flags from the client configuration
    if (partner?.featureFlags && Array.isArray(partner.featureFlags)) {
      return partner.featureFlags;
    }
    return [];
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
    return userService.getUsersByClientMembership(clientId, paging, filter);
  }

  @roles(["ADMIN"])
  @mutation("ReactoryClientAddRoute")
  async addRoute(obj: any, params: { clientId: string, route: any }, context: Reactory.Server.IReactoryContext) {
    const systemService = context.getService<Reactory.Service.IReactorySystemService>("core.SystemService@1.0.0");
    return systemService.addRoute(params.clientId, params.route);
  }

  @roles(["ADMIN"])
  @mutation("ReactoryClientUpdateRoute")
  async updateRoute(obj: any, params: { clientId: string, routeId: string, route: any }, context: Reactory.Server.IReactoryContext) {
    const systemService = context.getService<Reactory.Service.IReactorySystemService>("core.SystemService@1.0.0");
    return systemService.updateRoute(params.clientId, params.routeId, params.route);
  }

  @roles(["ADMIN"])
  @mutation("ReactoryClientDeleteRoute")
  async deleteRoute(obj: any, params: { clientId: string, routeId: string }, context: Reactory.Server.IReactoryContext) {
    const systemService = context.getService<Reactory.Service.IReactorySystemService>("core.SystemService@1.0.0");
    return systemService.deleteRoute(params.clientId, params.routeId);
  }

  @roles(["ADMIN"])
  @mutation("ReactoryClientReorderRoutes")
  async reorderRoutes(obj: any, params: { clientId: string, routeIds: string[] }, context: Reactory.Server.IReactoryContext) {
    const systemService = context.getService<Reactory.Service.IReactorySystemService>("core.SystemService@1.0.0");
    return systemService.reorderRoutes(params.clientId, params.routeIds);
  }

  @roles(["ADMIN"])
  @mutation("ReactoryClientUpdateMenus")
  async updateMenus(obj: any, params: { clientId: string, menus: any[] }, context: Reactory.Server.IReactoryContext) {
    const systemService = context.getService<Reactory.Service.IReactorySystemService>("core.SystemService@1.0.0");
    return systemService.updateMenus(params.clientId, params.menus);
  }

  @roles(["ADMIN"])
  @mutation("ReactoryClientUpdateRoles")
  async updateRoles(obj: any, params: { clientId: string, roles: string[] }, context: Reactory.Server.IReactoryContext) {
    const systemService = context.getService<Reactory.Service.IReactorySystemService>("core.SystemService@1.0.0");
    return systemService.updateApplicationRoles(params.clientId, params.roles);
  }

  @roles(["ADMIN"])
  @mutation("ReactoryClientUpdateSettings")
  async updateSettings(obj: any, params: { clientId: string, settings: any[] }, context: Reactory.Server.IReactoryContext) {
    const systemService = context.getService<Reactory.Service.IReactorySystemService>("core.SystemService@1.0.0");
    return systemService.updateSettings(params.clientId, params.settings);
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
