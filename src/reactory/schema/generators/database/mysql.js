
import { isArray } from 'lodash';
import { 
  queryAsync as mysql,   
} from '../../../../database/mysql'; 
import logger from '../../../../logging';

const listSchemas = async ( connectionId ) => {

  const sql = `
  select schema_name as database_name
  from information_schema.schemata
  where schema_name != 'information_schema'
  order by schema_name;`;

  return await mysql(sql, connectionId).then();

};

const listTables = async( connectionId, schema ) => {
  logger.debug(`Listing Tables for Schema`, schema);
  return await mysql(`
    SELECT table_schema as schemaName, table_name as tableName FROM information_schema.tables where table_schema='${schema}';
  `, connectionId).then()
};

const listColumns = async( connectionId, table ) => {
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

const formDefinitionFromTableConnection = (table, connectionId = 'mysql.default') => {
  logger.debug('Generating Form Definition For', {table, connectionId});
  return {
    id: `core-generated.Connected_${table}@${connectionId}`,
    uiFramework: 'material',        
    uiSupport: ['material'],
    uiResources: [
      //add your resources
    ],
    name: `ReactoryConnectedTableForm_${connectionId ? connectionId.replace('.','_') : 'mysql_default'}_${table}`,
    nameSpace: 'core-generated',
    version: '1.0.0',
    componentDefs: [],
    description: `${table}@${connectionId}`,
    author: {
      fullName: 'Reactory Engine',
      email: 'io@reactory.net',
    },
    helpTopics: [
      `Reactory ${table}`,
    ],    
    registerAsComponent: true,
    schema: {
      type: 'object',
      title: `Table Access For ${table}`,
      properties: {
        id: {
          type: 'string',
          title: 'id'
        }
      },    
    },        
    uiSchema: {

    },
    uiSchemas: [
      { id: 'default', value: 'default', title: 'default', uiSchema: {}, icon: 'view_stream' },
    ],     
  };

};

export const generate = async (props) => {
  
  const schemas = props.schemas || await listSchemas( props.connectionId || 'mysql.default' ).then();
  let tables = [];

  const tableResults = await Promise.all(schemas.map((schema) => {
    return listTables( props.connectionId || 'mysql.default', schema.database_name );
  })).then();

  tableResults.forEach(result => {
    if(isArray(result) === true) {  
      tables = [...tables, ...result];
    }    
  });
    
  await Promise.all(tables.map((table) => {
    return listColumns(props.connectionId || 'mysql.default', table);
  })).then();

  
  return tables.map( table => {
    return formDefinitionFromTableConnection(table, props.connectionId || 'mysql.default');
  });
};

export default generate;