import Reactory from '@reactory/reactory-core';
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