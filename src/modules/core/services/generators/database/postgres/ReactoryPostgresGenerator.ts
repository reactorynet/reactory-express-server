import Reactory, { Forms } from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import { PostgresOptions, Context, Generator, PostgresTableOptions, PostgresConnectionCredentials } from './types'
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
  service: string;
  method: string;
  
  [key: string]: unknown;
  nameSpace: string;
  name: string;
  version: string;
  props: PostgresOptions;
  context: Reactory.Server.IReactoryContext;

  tableGenerator: Generator<PostgresTableOptions, Context>;

  constructor(props: PostgresOptions, context: Context) {
    this.props = props;
    this.context = context;
  }
  
  toString(includeVersion?: boolean): string {
    return includeVersion ? `${this.nameSpace}.${this.name}@${this.version}` : this.name;
  }
  

  async generate(): Promise<Forms.IReactoryForm[]> {
    const { context, props } = this;
    const { connection, entities, outputs } = props;
    const { partner, user, state } = context;
    context.info(`${this.toString(true)} - Generating forms from Postgres database using connection ${connection}`);
    const connectionSetting = partner.getSetting<PostgresConnectionCredentials>(connection);
    if (!connectionSetting || !connectionSetting.data) {
      context.error(`Connection settings not found for ${connection}. Please check client settings for ${partner.name} (key ${partner.key})`);
      return [];
    }
    
    const forms: Forms.IReactoryForm[] = [];

    try {
      this.tableGenerator.props = {
        connection,
        entities,
        outputs
      };
      this.tableGenerator.generate();
    } catch(e) {
      context.error(`Error generating forms from Postgres database ${connection}`, e);
    }
  }

  setTableGenerator(generator: Generator<PostgresTableOptions, Context>) {
    this.tableGenerator = generator;
  }
}


export default ReactoryPostgresGenerator;