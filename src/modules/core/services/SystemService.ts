import { Reactory } from '@reactory/server-core/types/reactory';
import { ReactoryClient, Menu } from '@reactory/server-core/models';
import { ObjectId } from 'bson';
import { execql, execml } from '@reactory/server-core/graph/client'

class SystemService implements Reactory.Service.IReactorySystemService {

  props: Reactory.IReactoryServiceProps;
  context: Reactory.IReactoryContext;

  name: string;
  nameSpace: string;
  version: string;

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  getReactoryClients(query: any): Promise<Reactory.TReactoryClient[]> {
    return ReactoryClient.find(query);
  }

  getMenusForClient(client: Reactory.TReactoryClient): Promise<Reactory.IReactoryMenu[]> {
    return Menu.find({ client });
  }

  query(query: string, variables: any): Promise<any> {
    return execql(query, variables, {}, this.context.user, this.context.partner);
  }
  
  mutate(mutation: string, variables: any): Promise<any> {
    return execml(mutation, variables, {}, this.context.user, this.context.partner);
  }

  async getReactoryClient(id: string | ObjectId, populate?: string[]): Promise<Reactory.IReactoryClientDocument | Reactory.IReactoryClient> {
    
    let qry = ReactoryClient.findById(id);
    if(populate && populate.length > 0) {
      populate.forEach((e) => { qry = qry.populate(e) });
    }

    const client = await qry.then();
    
    return client;
  }
  
  onStartup(): Promise<any> {
    return Promise.resolve(true);
  }
  
  
  getExecutionContext(): Reactory.IReactoryContext {
    return this.context
  }
  
  setExecutionContext(context: Reactory.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  static reactory: Reactory.IReactoryServiceDefinition = {
    id: 'core.SystemService@1.0.0',
    description: 'The core system service, responsible for Reactory tennant / client configuration and statistics',
    name: 'Reactory System Service',
    dependencies: [],
    serviceType: 'data',
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new SystemService(props, context);
    }
  }
}

export default SystemService;