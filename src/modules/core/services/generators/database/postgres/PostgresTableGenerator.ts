import Reactory from "@reactory/reactory-core";
import postgres from "postgres";
import { PostgresOptions } from "./types";
import { roles } from "@reactory/server-core/authentication/decorators";

type TC = Reactory.Server.IReactoryContext;
type TP = Reactory.Service.IReactoryServiceProps & PostgresOptions

type PostgresConnectionCredentials = { 
  host: string, 
  port: number, 
  database: string, 
  username: string, 
  password: string 
}

const DEFAULT_CONNECTION_SETTINGS: PostgresConnectionCredentials = { 
  host: process.env.REACTORY_POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.REACTORY_POSTGRES_PORT || '5432'),
  username: process.env.REACTORY_POSTGRES_USER || 'reactory',
  password: process.env.REACTORY_POSTGRES_PASSWORD || 'reactory',
  database: process.env.REACTORY_POSTGRES_DB || 'reactory',
};

  class PostgresTableToFormGenerator implements
    Reactory.Service.IReactoryService {
    props: TP;
    context: TC;
    nlpService: Reactory.Service.INaturalService;
    constructor(props: TP, context: Reactory.Server.IReactoryContext) {      
      this.props = props;
      this.context = context;
    }
    description?: string;
    tags?: string[];
    toString?(includeVersion?: boolean): string {
      throw new Error("Method not implemented.");
    }
    nameSpace: string;
    name: string;
    version: string;

    @roles(['DEVELOPER'])
    async generate(): Promise<Reactory.Forms.IReactoryForm[]> {
        const forms : Reactory.Forms.IReactoryForm[] = [];
        if(!this.props) {
          throw new Error('No options provided');
        }

        if(!this.context) {
          throw new Error('No context provided');
        }

        const {
          connection,
          table,
          columns,
        } = this.props;

        if(!connection) {
          throw new Error('No connection provided');
        }

        if(!table) {
          throw new Error('No table name provided');
        }

        // get the connection from the context
        const connectionSettings = this.context.partner.getSetting<PostgresConnectionCredentials>(connection, DEFAULT_CONNECTION_SETTINGS);

        if(!connectionSettings) {
          throw new Error('No connection settings found');
        }

        const db = postgres({
          host: connectionSettings.data.host,
          port: connectionSettings.data.port,
          username: connectionSettings.data.username,
          password: connectionSettings.data.password,
          database: connectionSettings.data.database,
        });

        const schema = await db`SELECT * FROM information_schema.columns WHERE table_name = ${table}`;
        const form: Reactory.Forms.IReactoryForm = {
          id: `postgres-${connection}-${table}-form`,
          name: `${table}`,
          title: `${table} list`,

        };

        return forms;
    }
  }

  const PostgresTableGeneratorServiceDefinition: Reactory.Service.IReactoryServiceDefinition<PostgresTableToFormGenerator> = {
    nameSpace: 'core',
    name: 'PostgresTableToFormGenerator',
    version: '1.0.0',
    description: 'Generates a form from a Postgres table schema',
    service: (props: any, context: Reactory.Server.IReactoryContext) => new PostgresTableToFormGenerator(props, context),
    lifeCycle: 'instance',
    dependencies: [
      { id: 'core.ReactoryNLPService@1.0.0', alias: 'nlpService' }
    ],
    serviceType: "schemaGeneration",
    secondaryTypes: [
      "build",
      "codeGeneration",
    ]
  };

  export default PostgresTableGeneratorServiceDefinition;