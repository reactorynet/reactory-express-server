import Reactory from '@reactory/reactory-core';
import { ReactoryClient, Menu } from '@reactory/server-core/models';
import { ObjectId } from 'bson';
import { execql, execml } from '@reactory/server-core/graph/client'

class SystemService implements Reactory.Service.IReactorySystemService {

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

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
    return execql(query, variables, {}, this.context.user, this.context.partner);
  }
  
  mutate(mutation: string, variables: any): Promise<any> {
    return execml(mutation, variables, {}, this.context.user, this.context.partner);
  }

  async getReactoryClient(id: string | ObjectId, populate?: string[]): Promise<Reactory.Models.IReactoryClientDocument | Reactory.Models.IReactoryClient> {
    
    let qry = ReactoryClient.findById(id);
    if(populate && populate.length > 0) {
      populate.forEach((e) => { qry = qry.populate(e) });
    }

    const client = await qry.exec();
    
    return client;
  }
  
  onStartup(): Promise<any> {
    return Promise.resolve(true);
  }
  
  
  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context
  }
  
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  static reactory: Reactory.Service.IReactoryServiceDefinition = {
    id: 'core.SystemService@1.0.0',
    description: 'The core system service, responsible for Reactory tennant / client configuration and statistics',
    name: 'Reactory System Service',
    dependencies: [],
    serviceType: 'data',
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
      return new SystemService(props, context);
    }
  }
}

export default SystemService;