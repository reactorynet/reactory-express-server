import Reactory from '@reactorynet/reactory-core';
import modules from '@reactory/server-core/modules';
import { ReactoryClient, Menu } from '@reactory/server-modules/reactory-core/models'
import { ObjectId } from 'bson';
import { queryGraph as execql, mutateGraph as execml } from '@reactory/server-core/graph/ReactoryApolloClient'
import { map } from 'lodash';
import { ComponentFQN, FQN2ID } from '@reactory/server-core/utils/string';
import { ThemeService } from './ThemeService';


interface IModuleValidationResult {
  module: Reactory.Server.IReactoryModule;
  valid: boolean;
  errors: string[];
  warnings: string[];
}
class SystemService implements Reactory.Service.IReactorySystemService {

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  searchService: Reactory.Service.ISearchService;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  async getReactoryClients(query: any): Promise<Reactory.Models.TReactoryClient[]> {
    return ReactoryClient.find(query).clone();
  }

  async getMenusForClient(client: Reactory.Models.TReactoryClient): Promise<Reactory.UX.IReactoryMenuConfig[]> {
    // Prefer the client's hydrated menu references. Menus are reconciled
    // against the source config on startup (see ReactoryClient.synchronizeMenus),
    // so the reference array is the authoritative set for the tenant. Fall back
    // to a client-field query when no references are present (e.g. legacy data
    // that predates reconciliation) so we never regress to an empty menu.
    const clientId = (client as any)?._id || client;
    const refs: any[] | null = Array.isArray((client as any)?.menus)
      ? (client as any).menus
      : null;

    if (refs && refs.length > 0) {
      const ids = refs.map((ref: any) => (ref && ref._id ? ref._id : ref));
      const menus = await Menu.find({ _id: { $in: ids } }).clone();
      const order = new Map<string, number>(ids.map((id: any, index: number) => [String(id), index]));
      return (menus as any[]).sort(
        (a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0)
      ) as Reactory.UX.IReactoryMenuConfig[];
    }

    return await Menu.find({ client: clientId }).clone();
  }

  query(query: string, variables: any): Promise<any> {
    return execql(query, variables, {},  this.context);
  }
  
  mutate(mutation: string, variables: any): Promise<any> {
    return execml(mutation, variables, {}, this.context);
  }

  async getReactoryClient(id: string | ObjectId, populate?: string[]): Promise<Reactory.Models.IReactoryClientDocument | Reactory.Models.IReactoryClient> {
    
    let qry = ReactoryClient.findById(id);
    if(populate && populate.length > 0) {
      populate.forEach((e) => { qry = qry.populate(e) });
    }

    const client = await qry.exec();
    
    return client as Reactory.Models.IReactoryClient;
  }

  private validateModule(module: Reactory.Server.IReactoryModule): { valid: boolean, errors: string[]  } {
    const fqn = ComponentFQN(module);    
    let errors: string[] = [];
    if(module.cli?.length > 0) { 
      // module has cli commands available
      module.cli.forEach((cmd, idx) => {
        try {
          ComponentFQN(cmd);
        } catch(ex) {
          errors.push(`Module ${fqn}} is missing a name or description for registered cli command: at index ${idx}`);
        }        
      });

      module.clientPlugins.forEach((plugin, idx) => { 
        try {
          ComponentFQN(plugin);
        } catch (ex) {
          errors.push(`Module ${fqn}} is missing a name or description for registered client plugin at index: at index ${idx}`);
        }
      });

      module.forms.forEach((form, idx) => { 
        try {
          ComponentFQN(form);
        } catch (ex) {
          errors.push(`Module ${fqn}} is missing a name or description for registered form at index: at index ${idx}`);
        }
      });

      module.models.forEach((model, idx) => { 
        try {
          ComponentFQN(model);
        } catch (ex) {
          errors.push(`Module ${fqn}} is missing a name or description for registered model at index: at index ${idx}`);
        }
      });

      module.passportProviders.forEach((provider, idx) => { 
        try {
          ComponentFQN(provider);
        } catch (ex) {
          errors.push(`Module ${fqn}} is missing a name or description for registered passport provider at index: at index ${idx}`);
        }
      });

      module.pdfs.forEach((pdf, idx) => { 
        try {
          ComponentFQN(pdf);
        } catch (ex) {
          errors.push(`Module ${fqn}} is missing a name or description for registered pdf at index: at index ${idx}`);
        }
      });

      module.services.forEach((service, idx) => { 
        try {
          //@ts-ignore
          if(service.prototype?.COMPONENT_DEFINITION) { 
            //@ts-ignore
            ComponentFQN(service.prototype.COMPONENT_DEFINITION);
            //@ts-ignore
          } else if(service.prototype?.reactory) {
            //@ts-ignore
            ComponentFQN(service.prototype?.reactory);
          } else {
            ComponentFQN(service);
          }
        } catch (ex) {
          errors.push(`Module ${fqn}} is missing a name or description for registered service at index: at index ${idx}`);
        } 
      });

      module.workflows.forEach((workflow, idx) => { 
        try {
          ComponentFQN(workflow);
        } catch (ex) {
          errors.push(`Module ${fqn}} is missing a name or description for registered workflow at index: at index ${idx}`);
        } 
      });
    }

    return {
      valid: errors.length === 0 ? true : false,
      errors,    
    }
  }
  
  async onStartup(): Promise<any> {
    //index modules
    const { enabled } = modules;
    const { searchService, context } = this;

    type SearchableComponent = Partial<Reactory.IReactoryComponentDefinition<any>> & { id: string };
       
    // Returns null when a component cannot be resolved to an FQN/id. Callers MUST
    // skip nulls: a null in the payload makes Meilisearch reject the entire batch
    // ("The `json` payload provided is malformed ... data are neither an object
    // nor a list of objects").
    const componentToSearchModel = (component: Reactory.IReactoryComponentDefinition<any>, group: string): SearchableComponent | null => {
      let definition = component;
      if (component.prototype?.COMPONENT_DEFINITION) {
        definition = component.prototype.COMPONENT_DEFINITION;
      }
      let componentFqn: string;
      let componentId: number;
      try {
        componentFqn = ComponentFQN(definition);
        componentId = FQN2ID(componentFqn);
      } catch (ex) {
        // `componentFqn` is undefined on this path — name the group so the log is useful.
        context.error(`Error converting a ${group} component to a search model: ${ex.message}`);
        return null;
      }

      let searchModel: any = {
        ...component,
        id: componentId,
      }

      delete searchModel.component;
      // TODO: Refactor service enginer to use component instead of service
      if(searchModel.service) delete searchModel.service;

      return searchModel;
    }

    type SearchableModule =  Partial<Reactory.Server.IReactoryModule> & { id: number };
    // create index docs for each module
    const moduleDocuments: SearchableModule[] = [];
    enabled.forEach((module, midx) => { 
      //validate module
      try {
        const validationResult = this.validateModule(module);
        if(!validationResult.valid) { 
          this.context.error(`Module ${module?.nameSpace || 'unknown'}.${module?.name } @index ${midx} has component errors. ${validationResult.errors.join('\n')}`);
          return;
        } else {
          const moduleDoc: SearchableModule = {
            nameSpace: module.nameSpace,
            name: module.name,
            version: module.version,
            description: module.description,
            priority: module.priority,            
            id: FQN2ID(ComponentFQN(module)),
          };

          moduleDocuments.push(moduleDoc);
        }
      } catch (ex) {
          context.error(ex.message);
        return;
      }
      
    });

    ['models', 'clientPlugins', 'cli', 'forms', 'services', 'workflows', 'passportProviders', 'pdfs'].forEach((group) => { 
      const docs: any[] = [];
      enabled.forEach((module) => {
        //@ts-ignore
        if(module[group] && module[group].length > 0) {
          //@ts-ignore
          module[group].forEach((component, idx) => {
            if(component !== null && component !== undefined) {
              let componentDefinition = component;
              if(componentDefinition.prototype?.reactory) { 
                componentDefinition = componentDefinition.prototype.reactory;
              }

              const searchModel = componentToSearchModel(componentDefinition, group);
              if (searchModel) {
                docs.push(searchModel);
              } else {
                // Never push null: a single null poisons the whole index batch.
                context.warn(`Skipping a ${group} component on module ${module?.nameSpace || 'unknown'}.${module?.name} — no search model could be derived`);
              }
            } else {
              context.error(`Module ${module?.nameSpace || 'unknown'}.${module?.name } has a ${group} that is not defined at index ${idx}`);
            }
          });
        } else {
          //@ts-ignore
          if(module[group] === null || module[group] === undefined)
            context.warn(`Module ${module?.nameSpace || 'unknown'}.${module?.name } has no ${group} defined it is recommended that you define at least one ${group} for each module or provide an empty array.`);
        }
      });
      if (!searchService) {
        context.warn(`No search service available; skipping index reactory_${group}`);
        return;
      }
      // index() resolves to { success:false, error } on provider failure; this guard
      // also absorbs a rejected promise so onStartup cannot raise an unhandled rejection.
      Promise.resolve(searchService.index(`reactory_${group}`, docs)).catch((ex: any) =>
        context.error(`Indexing reactory_${group} failed: ${ex?.message || ex}`),
      );
    });
   
    return Promise.resolve(true);
  }
  
  
  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context
  }
  
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  setSearchService(searchService: Reactory.Service.ISearchService) { 
    this.searchService = searchService;
  }

  async addRoute(clientId: string, route: unknown): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    const routeObj: any = { ...(route as Record<string, unknown>) };
    if (!routeObj.id && !routeObj._id) {
      routeObj.id = routeObj.key || new ObjectId().toString();
    }

    const routes = (client as any).routes || [];
    routes.push(routeObj);
    (client as any).routes = routes;
    (client as any).markModified('routes');
    await (client as any).save();
    return client;
  }

  async updateRoute(clientId: string, routeId: string, route: unknown): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    const routes = (client as any).routes || [];
    const index = routes.findIndex((r: any) => 
      r.id === routeId || 
      r._id?.toString() === routeId || 
      r.key === routeId
    );

    if (index === -1) throw new Error(`Route ${routeId} not found on ReactoryClient ${clientId}`);

    const existing = typeof routes[index].toObject === 'function' ? routes[index].toObject() : routes[index];
    routes[index] = {
      ...existing,
      ...(route as Record<string, unknown>),
      id: existing.id || routeId,
    };

    (client as any).routes = routes;
    (client as any).markModified('routes');
    await (client as any).save();
    return client;
  }

  async deleteRoute(clientId: string, routeId: string): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    const routes = (client as any).routes || [];
    (client as any).routes = routes.filter((r: any) => 
      r.id !== routeId && 
      r._id?.toString() !== routeId && 
      r.key !== routeId
    );
    (client as any).markModified('routes');
    await (client as any).save();
    return client;
  }

  async reorderRoutes(clientId: string, routeIds: string[]): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    const routes = (client as any).routes || [];
    const routeMap = new Map<string, any>();
    for (const route of routes) {
      const id = route.id || route._id?.toString() || route.key;
      if (id) routeMap.set(id, route);
    }

    const reordered: any[] = [];
    for (const id of routeIds) {
      const match = routeMap.get(id);
      if (match) {
        reordered.push(match);
        routeMap.delete(id);
      }
    }

    // Append any routes not included in the reorder list at the end
    for (const remaining of routeMap.values()) {
      reordered.push(remaining);
    }

    (client as any).routes = reordered;
    (client as any).markModified('routes');
    await (client as any).save();
    return client;
  }

  async updateMenus(clientId: string, menus: unknown[]): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    const menuIds: ObjectId[] = [];
    for (const menuInput of menus as any[]) {
      if (menuInput.id) {
        await Menu.findByIdAndUpdate(menuInput.id, menuInput, { new: true }).exec();
        menuIds.push(new ObjectId(menuInput.id));
      } else {
        const created = await Menu.create({ ...menuInput, client: clientId });
        menuIds.push(created._id as unknown as ObjectId);
      }
    }

    const updated = await ReactoryClient.findByIdAndUpdate(
      clientId,
      { $set: { menus: menuIds } },
      { new: true },
    ).exec();
    return updated!;
  }

  async updateApplicationRoles(clientId: string, roles: string[]): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findByIdAndUpdate(
      clientId,
      { $set: { applicationRoles: roles } },
      { new: true },
    ).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);
    return client;
  }

  async updateSettings(clientId: string, settings: unknown[]): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findByIdAndUpdate(
      clientId,
      { $set: { settings } },
      { new: true },
    ).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);
    return client;
  }

  async addFeatureFlag(clientId: string, featureFlag: unknown): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findByIdAndUpdate(
      clientId,
      { $push: { featureFlags: featureFlag } },
      { new: true },
    ).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);
    return client;
  }

  async updateFeatureFlag(clientId: string, feature: string, featureFlag: unknown): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    const flags = (client as any).featureFlags || [];
    const index = flags.findIndex((f: any) => f.feature === feature);
    if (index === -1) throw new Error(`Feature flag "${feature}" not found on client ${clientId}`);

    flags[index] = { ...flags[index].toObject?.() ?? flags[index], ...(featureFlag as any) };
    (client as any).featureFlags = flags;
    await (client as any).save();
    return client;
  }

  async deleteFeatureFlag(clientId: string, feature: string): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    (client as any).featureFlags = ((client as any).featureFlags || []).filter(
      (f: any) => f.feature !== feature,
    );
    await (client as any).save();
    return client;
  }

  /**
   * Theme behaviour lives in the shared `ThemeService` (ORG-004) so clients
   * and organizations use one implementation. The delegating wrappers below
   * keep this service's public contract - and therefore its behaviour -
   * unchanged.
   */
  private themeService(): ThemeService {
    return new ThemeService(this.context);
  }

  async setActiveTheme(clientId: string, themeName: string): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    // `requireExisting: false` preserves the historical contract: the pointer
    // was stored verbatim, without checking the client's theme list.
    return this.themeService()
      .setActiveTheme(client as any, themeName, undefined, { requireExisting: false });
  }

  async saveTheme(clientId: string, theme: any): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    return this.themeService().saveTheme(client as any, theme);
  }

  async deleteTheme(clientId: string, themeName: string): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    // Clients historically fell back to the default theme name rather than a
    // null pointer when the last theme was removed.
    return this.themeService().deleteTheme(client as any, themeName, { emptyFallback: 'reactory' });
  }

  async publishThemeCss(themeName: string, cssContent: string, clientId?: string): Promise<boolean> {
    let holder: any;

    // Also update the client asset entry if a clientId is provided. A lookup
    // or linking failure must never fail the publish - the CSS is on disk.
    if (clientId) {
      try {
        const client = await ReactoryClient.findById(clientId).exec();
        if (client) holder = client;
      } catch (err) {
        this.context.error(`Failed to link styles.css asset on client: ${err.message}`);
      }
    }

    return this.themeService().publishThemeCss(themeName, cssContent, holder);
  }

  async getThemeCss(themeName: string): Promise<string> {
    return this.themeService().getThemeCss(themeName);
  }

  static reactory: Reactory.Service.IReactoryServiceDefinition<SystemService> = {
    id: 'core.SystemService@1.0.0',
    nameSpace: 'core',
    description: 'The core system service, responsible for Reactory tennant / client configuration and statistics',
    name: 'SystemService',
    version: '1.0.0',
    dependencies: [
      {
        id: 'core.ReactorySearchService@1.0.0',
        alias: 'searchService'
      }
    ],
    serviceType: 'data',
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext): SystemService => {
      return new SystemService(props, context);
    }
  }
}

export default SystemService;