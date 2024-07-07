import Reactory from "@reactory/reactory-core";
import Postgres from "postgres";
import {
  PostgresColumn, 
  PostgresConnectionCredentials, 
  PostgresOptions, 
  PostgresTable} from "./types";
import { roles } from "@reactory/server-core/authentication/decorators";
import { service } from "@reactory/server-core/application/decorators";

type TC = Reactory.Server.IReactoryContext;
type TP = Reactory.Service.IReactoryServiceProps & PostgresOptions;

const DEFAULT_CONNECTION_SETTINGS: PostgresConnectionCredentials = {
  host: process.env.REACTORY_POSTGRES_HOST || "localhost",
  port: parseInt(process.env.REACTORY_POSTGRES_PORT || "5432"),
  username: process.env.REACTORY_POSTGRES_USER || "reactory",
  password: process.env.REACTORY_POSTGRES_PASSWORD || "reactory",
  database: process.env.REACTORY_POSTGRES_DB || "reactory",
};

@service({
  id: "core.PostgresTableToFormGenerator@1.0.0",
  nameSpace: "core",
  name: "PostgresTableToFormGenerator",
  version: "1.0.0",
  description: "Generates a form from a Postgres table schema",
  roles: ["DEVELOPER"],
  lifeCycle: "instance",
  dependencies: [
    { id: "core.ReactoryNLPService@1.0.0", alias: "nlpService" },
  ],
  serviceType: "schemaGeneration",
  secondaryTypes: ["build", "codeGeneration"],
})
class PostgresTableToFormGenerator extends Reactory.Service.ReactoryService<TP, TC>  
{
  props: TP;
  context: TC;
  nlpService: Reactory.Service.INaturalService;
  db: Postgres.Sql<{}>
  
  constructor(props: TP, context: Reactory.Server.IReactoryContext) {
    super();
    this.props = props;
    this.context = context;
    this.toJSType = this.toJSType.bind(this);
    this.getName = this.getName.bind(this);
    this.generateGridForEntity = this.generateGridForEntity.bind(this);
    this.getItemSchema = this.getItemSchema.bind(this);
  }
  
  /**
   * Converts a postgres column type to a javascript type
   * @param type 
   * @returns 
   */
  toJSType(type: string): string { 
    switch(type) {
      case "time with time zone":
      case "timestamp without time zone":
      case "timestamp with time zone":
      case "time without time zone":
      case "character varying":
      case "date":
      case "text":
      case "uuid":
        return "string";
      case "integer":
      case "numeric":
        return "number";
      case "boolean":
        return "boolean";
      case "json":
      case "jsonb":
        return "object";
      default:
        return "string";
    }
  }



  /**
   * A function that converts a properly cased and spaced name. 
   * i.e. audit_trail => Audit Trail
   * @param name - The table name to convert
   */
  getName(name: string): string {
    if(name === null || name === undefined) { 
      throw new Error("Table name is required");
    }
    
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  getFormName(name: string, stereoType: Reactory.Schema.UISchemaStereotype): string {
    return `${name.replace(' ', '')}${stereoType.toUpperCase()}Form`
  }

  getItemSchema(entity: Reactory.Forms.IReactoryDatabaseEntity): Reactory.Schema.AnySchema {
    let schema = {
      type: "object",
      properties: {}
    };

    for (const column of entity.columns) {
      // @ts-ignore
      schema.properties[column.name] = {
        type: column.type,
        title: this.getName(column.name),
        required: column.required,
        readOnly: column.readonly || false,
        unique: column.unique,
        default: column.defaultValue,
        description: column.comment,
      }
    }

    return schema;
  }

  async generateGridForEntity(entity: Reactory.Forms.IReactoryDatabaseEntity): Promise<Reactory.Forms.IReactoryForm> { 

    let friendlyName = this.getName(entity.name);

    const form: Reactory.Forms.IReactoryForm = {
      id: `postgres-${entity.name}-form`,
      nameSpace: this.props.module || "reactory",
      name: this.getFormName(friendlyName, "grid"),
      version: "1.0.0",
      title: `${friendlyName} Grid`,
      description: `Form for ${friendlyName} Grid`,
      schema: {
        type: "array",
        title: `${friendlyName} Grid`,
        items: this.getItemSchema(entity),
      },
      uiSchema: {},
      uiSchemas: [],
      allowClone: true,
      allowEdit: true,
      backButton: true,
      helpTopics: [`${friendlyName} Grid`],
      defaultUiSchemaKey: "default",
      icon: "table",
      uiFramework: "material-ui",
      tags: [],
    };

    form.id = `${form.nameSpace}.${form.name}@${form.version}`;

    return form;
  }

  generateObjectFormForEntity(entity: Reactory.Forms.IReactoryDatabaseEntity): Reactory.Forms.IReactoryForm {
    const form: Reactory.Forms.IReactoryForm = {
      id: `postgres-${entity.name}-form`,
      nameSpace: "core",
      name: this.getFormName(this.getName(entity.name), "default"),
      title: `${this.getName(entity.name)} form`,
      description: `Form for ${entity.name} entry`,
      schema: this.getItemSchema(entity),
      version: "1.0.0",
      uiSchema: {},
      uiSchemas: [],
    };

    return form;
  }

  /**
   * Will return an array of forms depending on the stereo types of the entity.
   * @param entity 
   * @returns 
   */
  async generateFormsForEntity(entity: Reactory.Forms.IReactoryDatabaseEntity): Promise<Reactory.Forms.IReactoryForm[]> {
    let { 
      stereoTypes = ["grid"],
      columns,
    } = entity;
    const { 
      db,
      context,
      props,
      toJSType
    } = this;

    const forms: Reactory.Forms.IReactoryForm[] = [];
    const tableSchema: PostgresTable[] = await db`SELECT * FROM information_schema.tables WHERE table_name = ${entity.name}`; 
    if(tableSchema.length === 0) { 
      context.warn(`Table ${entity.name} not found in database`, { entity }, 'warning')
      return [];
    }
    const columnSchemas: PostgresColumn[] = await db`SELECT * FROM information_schema.columns WHERE table_name = ${entity.name}`;
    if(!columns) {
      // create the columns from the schema
      columns = columnSchemas.map((column) => { 
        return {
          name: column.column_name,
          type: toJSType(column.data_type),
          nullable: column.is_nullable === "YES",
          ordinal: column.ordinal_position,
          autoIncrement: column.is_identity === "YES" || column.column_default === "nextval('${entity.name}_id_seq'::regclass)",
          defaultValue: column.column_default === "nextval('${entity.name}_id_seq'::regclass)" ? null : column.column_default,
          required: column.is_nullable === "NO",
          unique: column.is_updatable === "NO",
          readonly: column.is_updatable === "NO",
          comment: 'Generated from database schema'
        }
      });

      entity.columns = columns;
    }
    entity.schema = tableSchema[0].table_schema;
    // @ts-ignore
    entity.tableSchema = tableSchema[0];
    
    if(stereoTypes && stereoTypes.includes("grid")) {      
      forms.push(await this.generateGridForEntity(entity));
    }

    if(stereoTypes && stereoTypes.includes("default")) { 
      forms.push(await this.generateObjectFormForEntity(entity));
    }      
    
    return forms;
  }


  @roles(["DEVELOPER", "SYSTEM"])
  async generate(): Promise<Reactory.Forms.IReactoryForm[]> {
    const forms: Reactory.Forms.IReactoryForm[] = [];
    if (!this.props) {
      throw new Error("No options provided");
    }

    if (!this.context) {
      throw new Error("No context provided");
    }

    const { connection, entities } = this.props;

    if (!connection) {
      throw new Error("No connection provided");
    }

    if (!entities) {
      throw new Error("No entities provided");
    }

    // get the connection from the context
    const connectionSettings =
      this.context.partner.getSetting<PostgresConnectionCredentials>(
        connection,
        DEFAULT_CONNECTION_SETTINGS
      );

    if (!connectionSettings) {
      throw new Error("No connection settings found");
    }

    this.db = Postgres({
      host: connectionSettings.data.host,
      port: connectionSettings.data.port,
      username: connectionSettings.data.username,
      password: connectionSettings.data.password,
      database: connectionSettings.data.database,
    });
    
    for (const entity of entities) {
      const formsForEntity = await this.generateFormsForEntity(entity);
      forms.push(...formsForEntity);
    }

    return forms;
  }
}

export default PostgresTableToFormGenerator;
