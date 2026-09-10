import fs from 'fs';
import path from 'path';
import Reactory from '@reactorynet/reactory-core';
import modules from '@reactory/server-core/modules';
import { ReactoryClient, Menu } from '@reactory/server-modules/reactory-core/models'
import { ObjectId } from 'bson';
import { queryGraph as execql, mutateGraph as execml } from '@reactory/server-core/graph/ReactoryApolloClient'
import { map } from 'lodash';
import { ComponentFQN, FQN2ID } from '@reactory/server-core/utils/string';


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
    return await Menu.find({ client }).clone();
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
       
    const componentToSearchModel = (component: Reactory.IReactoryComponentDefinition<any>, group: string): SearchableComponent  => { 
      let definition = component;
      if(component.prototype?.COMPONENT_DEFINITION) {
        definition = component.prototype.COMPONENT_DEFINITION;
      }
       let componentFqn: string;
       let componentId: number;
      try {
        componentFqn = ComponentFQN(definition);
        componentId = FQN2ID(componentFqn);
      } catch (ex) {
        context.error(`Error converting component ${componentFqn} to search model: ${ex.message}`);
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

              docs.push(componentToSearchModel(componentDefinition, group));
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
      searchService.index(`reactory_${group}`, docs);
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

  async setActiveTheme(clientId: string, themeName: string): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    client.theme = themeName;
    await (client as any).save();
    return client;
  }

  async saveTheme(clientId: string, theme: any): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    const themes = (client as any).themes ? [...(client as any).themes] : [];
    const index = themes.findIndex((t: any) => t.name === theme.name || (theme.id && t.id === theme.id));

    if (index >= 0) {
      themes[index] = { ...themes[index], ...theme };
    } else {
      themes.push(theme);
    }

    (client as any).themes = themes;
    (client as any).markModified('themes');
    await (client as any).save();
    return client;
  }

  async deleteTheme(clientId: string, themeName: string): Promise<Reactory.Models.TReactoryClient> {
    const client = await ReactoryClient.findById(clientId).exec();
    if (!client) throw new Error(`ReactoryClient ${clientId} not found`);

    const themes = ((client as any).themes || []).filter((t: any) => t.name !== themeName && t.id !== themeName);
    (client as any).themes = themes;
    if (client.theme === themeName) {
      client.theme = themes[0]?.name || 'reactory';
    }
    (client as any).markModified('themes');
    await (client as any).save();
    return client;
  }

  async publishThemeCss(themeName: string, cssContent: string, clientId?: string): Promise<boolean> {
    const dataRoot = process.env.APP_DATA_ROOT || path.join(process.cwd(), '../reactory-data');
    const themeFolder = path.join(dataRoot, 'themes', themeName);

    if (!fs.existsSync(themeFolder)) {
      fs.mkdirSync(themeFolder, { recursive: true });
    }

    const cssPath = path.join(themeFolder, 'styles.css');
    fs.writeFileSync(cssPath, cssContent, { encoding: 'utf-8' });

    // Also update client asset entry if clientId is provided
    if (clientId) {
      try {
        const client = await ReactoryClient.findById(clientId).exec();
        if (client) {
          const themes = (client as any).themes ? [...(client as any).themes] : [];
          const themeIdx = themes.findIndex((t: any) => t.name === themeName);
          if (themeIdx >= 0) {
            const assets = themes[themeIdx].assets ? [...themes[themeIdx].assets] : [];
            const cssAssetIdx = assets.findIndex((a: any) => a.assetType === 'css' || a.id === 'styles');
            const cssAsset = {
              id: 'styles',
              name: 'styles.css',
              assetType: 'css',
              url: `themes/${themeName}/styles.css`,
            };
            if (cssAssetIdx >= 0) {
              assets[cssAssetIdx] = cssAsset;
            } else {
              assets.push(cssAsset);
            }
            themes[themeIdx].assets = assets;
            (client as any).themes = themes;
            (client as any).markModified('themes');
            await (client as any).save();
          }
        }
      } catch (err) {
        this.context.error(`Failed to link styles.css asset on client: ${err.message}`);
      }
    }

    return true;
  }

  async getThemeCss(themeName: string): Promise<string> {
    const dataRoot = process.env.APP_DATA_ROOT || path.join(process.cwd(), '../reactory-data');
    const cssPath = path.join(dataRoot, 'themes', themeName, 'styles.css');
    if (fs.existsSync(cssPath)) {
      return fs.readFileSync(cssPath, { encoding: 'utf-8' });
    }
    return '';
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