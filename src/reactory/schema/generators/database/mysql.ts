
import { isArray } from 'lodash';
import {
  queryAsync as mysql,
} from '@reactory/server-core/database/mysql';
import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';
import {
  GeneratorConfig,
  GeneratorTableDefinition,
  GeneratorDatabaseDefinition,
  GeneratorColumnDefinition
} from 'reactory/types';

import { ReactoryApplicationsForm } from 'data/forms/core/dashboard';

const listSchemas = async (props: GeneratorConfig): Promise<GeneratorDatabaseDefinition> => {

  const sql = `
  select 
    schema_name as name,
    "${props.connectionId}" as connectionId
  from information_schema.schemata
  where schema_name != 'information_schema'
  order by schema_name;`;

  return await mysql(sql, props.connectionId).then();
};

const listTables = async (schema: GeneratorDatabaseDefinition): Promise<GeneratorTableDefinition[]> => {
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

const listColumns = async (connectionId: string, table: GeneratorTableDefinition) => {
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
  logger.debug(`Mapping MySQL DataType ${dbType}`)
  switch (dbType.toLowerCase()) {
    case 'bool':
    case 'bit': {
      return 'boolean'
    }
    case 'int':
    case 'int32':
    case 'int64':
    case 'decimal':
    case 'float':
    case 'tinyint':
    case 'bigint': {
      return 'number'
    }
    case 'date':
    case 'date-time':
    case 'datetime':
    case 'varchar':
    case 'nvarchar':
    case 'char':
    default: {
      return 'string'
    }
  }
}

const nameFactory = (databaseName: string, entityType: string): string => {
  switch (entityType) {
    case 'table':
    default: {
      return databaseName.toLocaleUpperCase()
    }
  }
};

const arrayListFormFromTableConnection = (table: GeneratorTableDefinition, connectionId: string = 'mysql.default'): any => {
  logger.debug(`Generating List Definition For ${table.schemaName}.${table.tableName}@${connectionId}`);
  let _required: string[] = [];
  const tableName = nameFactory(table.tableName, 'table');

  let defaultSelectedColumns: any[] = [];

  let formRootPoperties: any = {
    filters: {
      type: 'array',
      title: 'Column Filter',
      items: {
        type: 'object',
        title: 'Column Filter',
        properties: {
          field: {
            type: 'string',
            title: 'Field Name',
          },
          value: {
            type: 'string',
            title: 'Value'
          },
          operator: {
            type: 'string',
            title: 'Operation'
          },
          modifier: {
            type: 'string',
            title: 'Operation Modifier',
          },
          invert: {
            type: 'boolean',
            title: 'Invert Operation (NOT)'
          }
        },
      },
    },
    paging: {
      type: 'object',
      title: 'Paging',
      properties: {
        total: {
          type: 'number',
          title: 'Total',
        },
        page: {
          type: 'number',
          title: 'Page'
        },
        hasNext: {
          type: 'boolean',
          title: 'Has Next'
        },
        pageSize: {
          type: 'number',
          title: 'Page Size'
        },
      },
    },
    columns: {
      type: "array",
      title: "Columns",
      items: {
        type: "object",
        properties: {
          field: {
            type: "string",
            title: "Column Name"
          },
          title: {
            type: "string",
            title: "Title"
          },
          widget: {
            type: ["string", "null"],
            title: "Widget"
          },
          selected: {
            type: "boolean",
            title: "Selected"
          }
        }
      }
    },
    context: {
      type: 'object',
      title: 'DB Context',
      properties: {
        schema: {
          type: 'string',
          title: 'Schema name'
        },
        table: {
          type: 'string',
          title: 'Table name'
        },
        commandText: {
          type: 'string',
          title: 'Command Text',
        },
        provider: {
          type: 'string',
          title: 'Provider'
        },
        connectionId: {
          type: 'string',
          title: 'Connection Id'
        },
      },
    },
    data: {
      type: 'array',
      title: `Table Data ${tableName}`,
      items: {
        type: 'object',
        properties: {

        },
      },
    },
  };


  let tableWidgetColumns: any[] = [];
  let propertiesUISchema: any = {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        context: { sm: 12, xs: 12, md: 12, lg: 4 },
        paging: { sm: 12, xs: 12, md: 6, lg: 4 },
        filters: { sm: 6, xs: 6, md: 3, lg: 2 },
        columns: { sm: 6, xs: 6, md: 3, lg: 2 },
      },
      {
        data: { sm: 12, xs: 12 },
      }
    ],
    context: {
      'ui:widget': 'LabelWidget',
      'ui:options': {
        format: 'Connection: ${formData.schema}.${formData.table}@${formData.connectionId}',
        variant: 'h6',
      },
    },
    columns: {
      'ui:widget': 'ColumnSelectorWidget',
    },
    filters: {
      'ui:widget': 'ColumnFilterWidget',
      items: {
        field: {
          'ui:widget': 'SelectWidget',
          'ui:options': {
            selectOptions: [

            ],
          },
        },
        operator: {
          'ui:widget': 'SelectWidget',
          'ui:options': {
            selectOptions: [
              { key: 'EQ', value: 'EQ', label: 'Equals == ?' },
              { key: 'GT', value: 'GT', label: 'Greater Than > ?' },
              { key: 'GTEQ', value: 'GTEQ', label: 'Greater Than or Equals >= ?' },
              { key: 'LT', value: 'LT', label: 'Less Than < ' },
              { key: 'LTEQ', value: 'LTEQ', label: 'Less Than or Equals <= ?' },
              { key: 'BETWEEN', value: 'BETWEEN', label: 'Between x and y' },
              { key: 'LIKE', value: 'LIKE', label: 'Like %value%' },
              { key: 'IN', value: 'IN', label: 'In ( ... )' },
            ],
          },
        },
        value: {

        },
        modifier: {
          'ui:widget': 'SelectWidget',
          'ui:options': {
            selectOptions: [
              { key: 'AND', value: 'AND', label: 'AND' },
              { key: 'OR', value: 'OR', label: 'OR' },
            ],
          },
        },
        invert: {

        },
      },
    },

    paging: {
      'ui:widget': 'DataPageWidget',
      'ui:options': {
        format: 'Records: (${formData.total | 0}) Data Set: ${formData.page | 1} of ${Math.floor(formData.total/formData.pageSize)}',
        variant: 'h6',
      },
    },

    data: {
      'ui:widget': 'MaterialTableWidget',
      'ui:options': {
        columnsProperty: 'columns',
        options: {
          selection: true,
          grouping: true,
        }
      },
      items: {

      },
    },
  };

  let exportColumns: any[] = [];

  if (table.columns && table.columns.length > 0) {

    table.columns.forEach((tableColumn: GeneratorColumnDefinition, index: number) => {
      const columnName = nameFactory(tableColumn.name, 'column');

      if (tableColumn.isNullable === false) _required.push(tableColumn.name);

      formRootPoperties.data.items.properties[tableColumn.name] = {
        type: getTypeFromDBType(tableColumn.dataType),
        default: tableColumn.defaultValue || null,
        description: `${tableColumn.metaData}`,
        title: columnName
      };

      tableWidgetColumns.push({
        title: columnName,
        field: tableColumn.name,
        selected: true,
        component: undefined
      });

      exportColumns.push({
        title: columnName,
        propertyField: tableColumn.name,
        format: '',
        width: 30,
        type: 'string',
        required: true,
        style: {}
      });

      /*
      propertiesUISchema.data.items[tableColumn.name] = {
        'ordinal': index,
        'ui:options': {
          enabled: true
        },
      },
      */

      propertiesUISchema.filters.items.field["ui:options"].selectOptions.push({
        key: tableColumn.name,
        value: tableColumn.name,
        label: columnName
      });

      if (tableColumn.isNullable === false) {
        propertiesUISchema.filters.items.field["ui:options"].selectOptions.push({
          key: 'null',
          value: null,
          label: 'Null (Empty / None)'
        })
      };

      defaultSelectedColumns.push({
        field: tableColumn.name,
        title: columnName,
        selected: true,
        component: undefined
      });
    });

    propertiesUISchema.data["ui:options"].columns = tableWidgetColumns;
  };

  return {
    id: `Generated.LIST_${table.schemaName}_${table.tableName}@${connectionId}`,
    uiFramework: 'material',
    uiSupport: ['material'],
    title: `${table.tableName.toUpperCase()} Table Access Form`,
    backButton: true,
    uiResources: [],
    name: `ReactoryConnectedTableList_${connectionId ? connectionId.replace('.', '_') : 'mysql_default'}_${table.tableName}`,
    nameSpace: 'core-generated',
    version: '1.0.0',
    componentDefs: [],
    description: `${table.tableName}@${connectionId}`,
    helpTopics: [
      `Help.Generated.${table.tableName}@${connectionId}`,
    ],
    registerAsComponent: true,
    schema: {
      type: 'object',
      title: `List Access For ${table.tableName}`,
      properties: formRootPoperties,
    },
    graphql: {
      query: {
        name: 'ReactorySQLQuery',
        text: `query ReactorySQLQuery($input: SQLQuery){
          ReactorySQLQuery(input: $input){  
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
              selected
            }
            filters {
              field
              value            
              operator
            }
            context {
              schema
              table
              commandText
              provider       
              connectionId                 
            }
            data
          }
        }`,
        variables: {
          'formData.paging.page': 'input.paging.page',
          'formData.paging.pageSize': 'input.paging.pageSize',
          'formData.columns': 'input.columns',
          'formData.filters': 'input.filters',
          'formData.context': 'input.context'
        },
        delete: false,
        edit: false,
        new: false,
        queryMessage: 'Executing Query',
        resultMap: {

        },
        options: {}
      },
    },
    defaultExport: {
      title: `Table ${table.tableName} Excel Export`,
      frameProps: {
        height: '100%',
        width: '100%',
        styles: {
          height: '100%',
          width: '100%',
        },
        url: `blob`,
        method: 'get'
      },
      engine: 'excel',
      useClient: true,
      mappingType: 'om',
      mapping: {
        'formData': 'sheets.Export',
      },
      exportOptions: {
        filename: `Export ${table.tableName}.xlsx`,
        sheets: [
          {
            name: 'Export',
            index: 0,
            arrayField: 'data',
            startRow: 1,
            columns: exportColumns,
          }
        ]
      }
    },
    defaultFormValue: {
      context: {
        table: tableName,
        connectionId: connectionId,
        schema: table.schemaName,
        provider: 'mysql',
        commandText: `SELECT * FROM ${table.tableName}`
      },
      columns: defaultSelectedColumns,
      paging: {
        pageSize: 100,
        page: 1
      }
    },
    uiSchema: propertiesUISchema,
    uiSchemas: [
      {
        id: 'default',
        key: 'default',
        description: `Table View for ${table.tableName}`,
        title: 'Table View',
        uiSchema: propertiesUISchema,
        icon: 'table_chart'
      },
      {
        id: 'list_view',
        key: 'list_view',
        description: `List View for ${table.tableName}`,
        title: 'List View',
        uiSchema: propertiesUISchema,
        icon: 'view_list'
      },
    ],
  };
};

const formDefinitionFromTableConnection = (table: GeneratorTableDefinition, connectionId = 'mysql.default'): Reactory.Forms.IReactoryForm => {
  logger.debug(`Generating Form Definition For ${table.schemaName}.${table.tableName}@${connectionId}`);
  let _required: string[] = [];
  let properties: any = {};

  let propertiesUISchema: any = {};

  if (table.columns && table.columns.length > 0) {
    table.columns.forEach((tableColumn: GeneratorColumnDefinition, index: number) => {

      if (tableColumn.isNullable === false) _required.push(tableColumn.name);

      let propertySchema: Reactory.ISchema = {
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
    name: `ReactoryConnectedTableForm_${connectionId ? connectionId.replace('.', '_') : 'mysql_default'}_${table.tableName}`,
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

export const generate = async (props: GeneratorConfig): Promise<Reactory.Forms.IReactoryForm[]> => {

  const schemas: GeneratorDatabaseDefinition[] = await listSchemas(props).then();
  let tables: GeneratorTableDefinition[] = [];

  const tableResults = await Promise.all(schemas.map((schema) => {
    return listTables(schema);
  })).then();

  tableResults.forEach(result => {
    if (isArray(result) === true) {
      tables = [...tables, ...result];
    }
  });

  await Promise.all(tables.map((table) => {
    return listColumns(props.connectionId, table);
  })).then();


  const generatedForms: Reactory.Forms.IReactoryForm[] = [];

  tables.forEach(table => {
    const instanceForm = formDefinitionFromTableConnection(table, props.connectionId || 'mysql.default');
    const listForm = arrayListFormFromTableConnection(table, props.connectionId || 'mysql.default');

    generatedForms.push(
      instanceForm,
      listForm,
      //JSON.stringify(instanceForm), 
      //JSON.stringify(listForm)
    );
  });

  return generatedForms;
};

export default generate;