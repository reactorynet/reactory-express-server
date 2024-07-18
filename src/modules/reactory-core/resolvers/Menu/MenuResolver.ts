
import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import mongoose from 'mongoose';


@resolver
class ReactoryMenuResolver {

  resolver: Reactory.Graph.IReactoryResolver;

/**
 * MenuItem: {
    id: menuItem => menuItem._id,
  },
  Menu: {
    id: menu => (menu._id.toString() || null),
    key: menu => (menu.key || 'na'),
    name: menu => (menu.name || 'na'),
    target: menu => (menu.target || 'na'),
    roles: menu => menu.roles || [],
    entries: menu => sortBy(menu.entries, 'ordinal'),
  },
 */

  @roles(["USER", "ANON"], 'args.context')
  @property("Menu", "id")
  async getMenuId(menu: any,
    params: any,
    context: Reactory.Server.IReactoryContext,
  ): Promise<string> {

    if (menu?._id) {
      return menu._id
    }

    return menu?.id
  }

  @roles(["USER", "ANON"], 'args.context')
  @property("Menu", "entries")
  async getMenuItemEntries(menuItem: any,
    params: any,
    context: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.UX.IMenuItem[]> {

    if (menuItem?.entries) {
      return context.utils.lodash.sortBy(menuItem.entries, "ordinal");
    }

    return []
  }

  @roles(["USER", "ANON"], 'args.context')
  @property("Menu", "roles")
  async getMenuRoles(menu: any,
    params: any,
    context: Reactory.Server.IReactoryContext,
  ): Promise<string[]> {

    if (menu?.roles) {
      return menu.roles;
    }

    return []
  }

  @roles(["USER", "ANON"], 'args.context')
  @property("MenuItem", "id")
  async getMenuItemId(menuItem: any,
    params: any,
    context: Reactory.Server.IReactoryContext,
  ): Promise<string> {

    if(menuItem?._id) {
      return menuItem._id
    }

    return menuItem?.id
  }

  /**
   * Resolver for menu item title text
   * @param menuItem 
   * @param params 
   * @param context 
   * @returns 
   */

  @roles(["USER", "ANON"], 'args.context')
  @property("MenuItem", "title")
  async getMenuItemTitle(menuItem: Reactory.UX.IMenuItem,
    params: any,
    context: Reactory.Server.IReactoryContext,
  ): Promise<string> {
    return context.i18n.t(menuItem.title);
  }

  
}

export default ReactoryMenuResolver;