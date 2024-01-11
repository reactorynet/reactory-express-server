import { service } from 'application/decorators';
import { roles } from 'authentication/decorators';
import { MeiliSearch, TaskStatus } from 'meilisearch';


@service({
  id: 'core.ReactorySearchService@1.0.0',
  description: 'Reactory Search Service',
  name: 'ReactorySearchService',
  nameSpace: 'core',
  version: '1.0.0',
  serviceType: 'data',
  dependencies: [],
})
class ReactorySearchService implements Reactory.Service.ISearchService {
  
  description?: string;
  tags?: string[];
  nameSpace: string;
  name: string;
  version: string;
  context: Reactory.Server.IReactoryContext;

  client: MeiliSearch;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_MASTER_KEY || 'masterKey',
    });
  }
  
  async search<T>(index: string, filter: string, fields?: string[], limit?: number, offset?: number): Promise<Reactory.Service.ISearchResults<T>> {
    const results = await this.client.index(index).search(filter, {
      attributesToHighlight: fields,
      limit,
      offset
    });
    return {
      limit: results.limit,
      offset: results.offset,
      total: results.totalHits,
      results: results.hits.map((hit) => hit as T),
    }
  }

  async index<T>(index: string, data: T[]): Promise<Reactory.Service.ISearchIndexResult> {
    try 
    {
      const task = await this.client.index(index).addDocuments(data);
      const taskIsOkay = (): boolean => {
        return task.status === TaskStatus.TASK_PROCESSING 
          || task.status === TaskStatus.TASK_SUCCEEDED 
          || task.status === TaskStatus.TASK_ENQUEUED;
      }
      return { id: task.indexUid, success: taskIsOkay()  };
    } catch (ex) {
      this.context.error(ex.message);
      return {
        id: '',
        success: false,
        error: ex.message,
      }
    }
  }

  async delete<T>(index: string, id: string): Promise<boolean> {
    return true
  }
  async onStartup(): Promise<void> {
    // create our index and add documents to it.    
    return;
  }
  
  toString?(includeVersion?: boolean): string {
    return `${this.nameSpace}.${this.name}${includeVersion ? `@${this.version}` : ''}`;
  }
  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): void {
    this.context = executionContext;
  }

}

export default ReactorySearchService;