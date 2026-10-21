import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';

/**
 * The subset of `OrganizationService` used by the organization theme surface.
 *
 * Declared locally because the published `IReactoryOrganizationService`
 * interface ships in the packaged `reactory-core` types and predates the theme
 * operations. The optional execution context is forwarded so the service's
 * org-scoped check (ORG-005) evaluates the caller.
 */
export interface IOrganizationThemeService {
  saveTheme(orgId: string, theme: any, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  setActiveTheme(orgId: string, themeName: string, mode?: string | null, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  deleteTheme(orgId: string, themeName: string, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  publishThemeCss(orgId: string, themeName: string, css: string, executionContext?: Reactory.Server.IReactoryContext): Promise<boolean>;
  getThemeCss(themeName: string): Promise<string>;
}

const ORGANIZATION_SERVICE_ID = 'core.OrganizationService@1.0.0';

const THEME_ROLES = ['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'];

const organizationThemeService = (context: Reactory.Server.IReactoryContext): IOrganizationThemeService =>
  context.getService(ORGANIZATION_SERVICE_ID) as unknown as IOrganizationThemeService;

/**
 * Organization branding (theme) resolvers.
 *
 * Kept in a separate resolver class from `Organization.ts` so ORG-005, which
 * rewrites that file, does not collide with the theme surface (ORG-004).
 * Every mutation delegates to `OrganizationService`, which enforces the role
 * guard itself; the decorators here reject non-admin callers before any work
 * happens. The execution context is passed explicitly so the service's
 * org-scoped `assertOrgAdmin` check evaluates the caller (ORG-005), not
 * whatever context the singleton happened to be constructed with.
 */
//@ts-ignore - this has to be called without the () as this throws an error in the decorator
@resolver
class OrganizationThemeResolver {

  resolver: Reactory.Graph.IResolverStruct;

  @mutation('OrganizationSaveTheme')
  @roles(THEME_ROLES)
  async saveTheme(
    obj: any,
    params: { id: string; theme: any },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationThemeService(context).saveTheme(params.id, params.theme, context);
  }

  @mutation('OrganizationSetActiveTheme')
  @roles(THEME_ROLES)
  async setActiveTheme(
    obj: any,
    params: { id: string; themeName: string; mode?: string | null },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationThemeService(context).setActiveTheme(params.id, params.themeName, params.mode, context);
  }

  @mutation('OrganizationDeleteTheme')
  @roles(THEME_ROLES)
  async deleteTheme(
    obj: any,
    params: { id: string; themeName: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationThemeService(context).deleteTheme(params.id, params.themeName, context);
  }

  @mutation('OrganizationPublishThemeCss')
  @roles(THEME_ROLES)
  async publishThemeCss(
    obj: any,
    params: { id: string; themeName: string; css: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationThemeService(context).publishThemeCss(params.id, params.themeName, params.css, context);
  }

  @query('OrganizationThemeCss')
  @roles(['USER'])
  async getThemeCss(
    obj: any,
    params: { themeName: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationThemeService(context).getThemeCss(params.themeName);
  }
}

export default OrganizationThemeResolver;
