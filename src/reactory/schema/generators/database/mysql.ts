
import { isArray } from 'lodash';
import { 
  queryAsync as mysql,   
} from '../../../../database/mysql'; 
import logger from '../../../../logging';
import { Reactory } from 'types/reactory';
import { 
  GeneratorConfig, 
  GeneratorTableDefinition, 
  GeneratorDatabaseDefinition, 
  GeneratorColumnDefinition} from 'reactory/types';
import { ReactoryApplicationsForm } from 'data/forms/core/dashboard';

const listSchemas = async ( props: GeneratorConfig ): Promise<GeneratorDatabaseDefinition> => {

  const sql = `
  select 
    schema_name as name,
    "${props.connectionId}" as connectionId
  from information_schema.schemata
  where schema_name != 'information_schema'
  order by schema_name;`;

  return await mysql(sql, props.connectionId).then();
};

const listTables = async( schema: GeneratorDatabaseDefinition ): Promise<GeneratorTableDefinition[]> =>  {
  logger.debug(`Listing Tables for ${schema.name}`);
  return await mysql(`
    SELECT 
      table_schema as schemaName, 
      table_name as tableName 
    FROM 
      information_schema.tables where 
        table_schema='${schema.name}';
    `, schema.connectionId).then()
};

const listColumns = async( connectionId: string, table: GeneratorTableDefinition ) => {
  const columns = await mysql(`
  SELECT 
	  COLUMN_NAME as name, 
	  ORDINAL_POSITION as position, 
    COLUMN_DEFAULT as defaultValue, 
    IS_NULLABLE as isNullable, 
    DATA_TYPE as dataType,
    CHARACTER_MAXIMUM_LENGTH as maxLength,
    NUMERIC_PRECISION as numericPrecision,
    NUMERIC_SCALE as numericScale,
    COLUMN_KEY as keyType,
    EXTRA as metaData
  FROM 
	  INFORMATION_SCHEMA.COLUMNS
  WHERE 
	  TABLE_SCHEMA = '${table.schemaName}' AND 
    TABLE_NAME = '${table.tableName}'
  ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION;
  `, connectionId).then();

  table.columns = columns;

  return table;
};

const MySqlDataTypeMap: Map<string, string> = new Map<string, string>()

const getTypeFromDBType = (dbType: string): string => {
  logger.debug(`Mapping MySQL DataType `)
  switch(dbType.toLowerCase()) {
    case 'bool': 
    case 'bit': {
      return 'boolean'
    }
    case 'int': 
    case 'int32':
    case 'int64':
    case 'decimal':
    case 'float':   
    case 'bigint': {
      return 'number'
    }
    case 'date':
    case 'date-time':
    case 'varchar': 
    case 'nvarchar': 
    case 'char':
    default: {
      return 'string'
    }
  }  
}

const nameFactory = (databaseName: string, entityType: string): string => {
  return databaseName;
};

const arrayListFormFromTableConnection = (table: GeneratorTableDefinition, connectionId: string = 'mysql.default'): Reactory.IReactoryForm => {
  logger.debug(`Generating List Definition For ${table.schemaName}.${table.tableName}@${connectionId}`);
  let _required: string[] = [];
  let properties: any = {};

  let tableWidgetColumns: any[] = [];



  let propertiesUISchema: any = {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {

    },
  };

  if(table.columns && table.columns.length > 0) {
    const tableName = nameFactory(table.tableName, 'table');
    table.columns.forEach((tableColumn: GeneratorColumnDefinition, index: number) => {
      const columnName = nameFactory(tableColumn.name, 'column');

      if(tableColumn.isNullable === false) _required.push(tableColumn.name);
            
      properties[tableColumn.name] = {
        type: getTypeFromDBType(tableColumn.dataType),
        default: tableColumn.defaultValue || null,
        description: `${tableColumn.metaData}`,
        title: columnName
      };

      tableWidgetColumns.push({
        title: columnName,
        field: tableColumn.name,
      });

      propertiesUISchema[tableColumn.name] = {
        'ordinal': index,
        'ui:options': {
          enabled: true
        },
      }
    });

    propertiesUISchema["ui:options"].columns = tableWidgetColumns;
    propertiesUISchema["ui:options"].options = {};
  }; 

  


  return {
    id: `Generated.LIST_${table.schemaName}_${table.tableName}@${connectionId}`,
    uiFramework: 'material',        
    uiSupport: ['material'],
    title: `${table.tableName.toUpperCase()} Table Access Form`,
    backButton: true,  
    uiResources: [],
    name: `ReactoryConnectedTableList_${connectionId ? connectionId.replace('.','_') : 'mysql_default'}_${table.tableName}`,
    nameSpace: 'core-generated',
    version: '1.0.0',
    componentDefs: [],
    description: `${table.tableName}@${connectionId}`,    
    helpTopics: [
      `Reactory ${table.tableName}`,
    ],
    registerAsComponent: true,
    schema: {
      type: 'array',
      title: `List Access For ${table.tableName}`,
      items: {
        type: 'object',
        title: `Row Item ${table.tableName}`,        
        properties: properties,
      },      
    },
    graphql: {
      query: {
        name: 'ReactorySQL',
        text: `query ReactorySQL($connectionId: String!, $input: ReactorySQLQuery){
          paging {
            total
            page
            hasNext
            pageSize
          }
          columns {
            field
            title
            widget
          }
          filters {
            field
            value            
            operator
          }
          context {
            schema
            table                        
          }
          data
        }`,
        variables: {
          'formData.paging': 'input.paging',
          'formData.columns': 'input.columns',
          'formData.filter': 'input.filter',
          'formData.context': 'input.context'
        },
      },
      

    },        
    uiSchema: propertiesUISchema,
    uiSchemas: [
      { 
        id: 'default',
        key: 'default', 
        description: "List View", 
        title: 'default',
        uiSchema: propertiesUISchema, 
        icon: 'view_stream'
      },
    ],     
  };
};

const formDefinitionFromTableConnection = (table: GeneratorTableDefinition, connectionId = 'mysql.default'): Reactory.IReactoryForm => {
  logger.debug(`Generating Form Definition For ${table.schemaName}.${table.tableName}@${connectionId}`);
  let _required: string[] = [];
  let properties: any = {};

  let propertiesUISchema: any = {};

  if(table.columns && table.columns.length > 0) {
    table.columns.forEach((tableColumn: GeneratorColumnDefinition, index: number) => {

      if(tableColumn.isNullable === false) _required.push(tableColumn.name);

      let propertySchema : Reactory.ISchema = {
        type: 'string',
        default: '',
        description: '',
        title: ''
      };

      propertySchema.title = tableColumn.name;
      propertySchema.type = getTypeFromDBType(tableColumn.dataType);
      propertySchema.description = `${tableColumn.metaData}`;
      propertySchema.default = tableColumn.defaultValue;
      properties[tableColumn.name] = propertySchema;      

      propertiesUISchema[tableColumn.name] = {
        'ordinal': index,
        'ui:options': {
          enabled: true
        },
      }
    });
  }; 

  

  return {
    id: `Generated.Connected_${table.schemaName}_${table.tableName}@${connectionId}`,
    uiFramework: 'material',        
    uiSupport: ['material'],
    title: `${table.tableName.toUpperCase()} Table Access Form`,
    backButton: true,  
    uiResources: [
      //add your resources
    ],
    name: `ReactoryConnectedTableForm_${connectionId ? connectionId.replace('.','_') : 'mysql_default'}_${table.tableName}`,
    nameSpace: 'core-generated',
    version: '1.0.0',
    componentDefs: [],
    description: `${table.tableName}@${connectionId}`,    
    helpTopics: [
      `Reactory ${table.tableName}`,
    ],
    registerAsComponent: true,
    schema: {
      type: 'object',
      title: `Table Access For ${table.tableName}`,
      properties: properties,                  
    },        
    uiSchema: propertiesUISchema,
    uiSchemas: [
      { 
        id: 'default',
        key: 'default', 
        description: "List View", 
        title: 'default',
        uiSchema: propertiesUISchema, 
        icon: 'view_stream'
      },
    ],     
  };

};

export const generate = async (props: GeneratorConfig): Promise<Reactory.IReactoryForm[]> => {
  
  const schemas: GeneratorDatabaseDefinition[] = await listSchemas( props ).then();
  let tables: GeneratorTableDefinition[] = [];

  const tableResults = await Promise.all(schemas.map((schema) => {
    return listTables( schema );
  })).then();

  tableResults.forEach(result => {
    if(isArray(result) === true) {  
      tables = [...tables, ...result];
    }
  });
    
  await Promise.all(tables.map((table) => {
    return listColumns(props.connectionId, table);
  })).then();

  
  const generatedForms: Reactory.IReactoryForm[] = [];

  tables.forEach( table => {
    const instanceForm = formDefinitionFromTableConnection(table, props.connectionId || 'mysql.default');
    const listForm =  arrayListFormFromTableConnection(table, props.connectionId || 'mysql.default');
    
    generatedForms.push(instanceForm, listForm);
  });

  return generatedForms;
};

export default generate;