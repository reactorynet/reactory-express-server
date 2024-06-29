import Reactory, { Forms } from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import { PostgresOptions, Context, Generator } from './types'
import { service } from '@reactory/server-core/application/decorators';

@service({
  id: 'core.ReactoryPostgresGenerator@1.0.0',
  description: 'Generates forms based on Postgres database tables, views, views, and functions.',
  tags: ['postgres', 'form', 'generator', 'database'],
  nameSpace: 'core',
  name: 'ReactoryPostgresGenerator',
  version: '1.0.0',
  dependencies: [{
    id: 'core.PostgresTableToFormGenerator@1.0.0',
    alias: 'tableGenerator'
  }],
  roles: ['DEVELOPER'],
  serviceType: 'schemaGeneration'
})
class ReactoryPostgresGenerator implements 
  Reactory.Forms.ReactoryFormGeneratorService<PostgresOptions, Context>  {
  
  id: string;
  optionsForm?: string;
  options?: any;
  service: string;
  method: string; 

  tableGenerator: Generator<PostgresTableOptions, Context>;

  constructor(props: PostgresOptions, context: TC) {
    this.options = props;
  }
  

  async generate(): Promise<Forms.IReactoryForm[]> {
    logger.info('Generating Postgres Form(s)', { options: this.options });
    return [];
  }
}


export default ReactoryPostgresGenerator;