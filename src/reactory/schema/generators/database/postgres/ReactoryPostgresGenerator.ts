import { Forms } from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import { PostgresOptions } from './types'

class ReactoryPostgresGenerator implements 
  Reactory.Forms.ReactoryFormGenerator<PostgresOptions>  {
  
  id: string;
  optionsForm?: string;
  options?: any;
  service: string;
  method: string; 


  constructor(options: PostgresOptions) {
    this.id = 'core-generators.PostgresFormGenerator@1.0.0';
    this.options = options;
    this.service = 'postgres';
    this.method = 'generate';
  }

  _id(): string {
    return this.id;
  }
  

  async generate(options: Forms.IReactoryRelationDatabaseFormGeneratorOptions): Promise<Forms.IReactoryForm[]> {
    logger.info('Generating Postgres Form(s)', { options });
    return [];
  }
}


export default ReactoryPostgresGenerator;