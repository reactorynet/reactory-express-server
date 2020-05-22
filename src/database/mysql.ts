import mysql, { MysqlError, FieldInfo } from 'mysql';
import logger from '../logging';
import ApiError from '../exceptions';
import {
  QueryStringGenerator,
  SQLQuery,
  SQLInsert,
  SQLDelete,
  SQLUpdate,
  SQLFilter,
  SQLColumn,
  QueryStringResultWithCount
} from './types';

let pool: mysql.Pool = null;

interface MySqlConnectionObject {
  host: string,
  database: string,
  user: string,
  password: string,
  port: number
}
const defaultConnectionObject: MySqlConnectionObject = {
  host: 'localhost',
  database: 'reactory',
  user: 'reactory',
  password: 'reactory',
  port: 3306,  
};

export const getPool = (database = 'plc', host = 'localhost', user = 'towerstone', password = process.end.DATABASE_PASSWORD_LEGACY, port = 3306, clientKey = 'plc') : mysql.Pool => {
  if (pool === null) {
    pool = mysql.createPool({
      connectionLimit: 100,
      host,
      user,
      password,
      database: database || clientKey,
      port,
    });
  }
  return pool;
};

export const getPoolWithObject = ({ 
  host = 'localhost', 
  user = 'reactory', 
  password = 'reactory', 
  database = 'reactory', 
  port = 3306, 
  connectionLimit = 100
}) => {
  if (pool === null) {
    pool = mysql.createPool({
      connectionLimit,
      host,
      user,
      password,
      database,
      port,
    });
  }
  return pool;
};

export const getConnection = (connectionId = 'mysql.default') => {
  if(!global.partner) throw new ApiError('Cannot get a connection without an active partner');

  const setting = global.partner.getSetting(connectionId, { 
    host: 'localhost',
    user: 'reactory',
    database: 'reactory',
    password: 'reactory',
    port: 3306,
    connectionLimit: 100    
  }, true);

  logger.debug(`Creating connection with configuration`, setting.data);
  return getPoolWithObject(setting.data);    
};

export const testConnection = (tenant = 'plc') => {
  logger.info('Testing MySQL database connection');
  return new Promise((resolve, reject) => {
    getPool(tenant).query('SELECT 1 + 1 AS solution', (error, results) => {
      if (error) reject(error);
      logger.info(results[0].solution.toString() === '2' ? 'MySQL Connection Available' : 'MySQL Connection NOT Available');
      resolve(true);
    });
  });
};


const whereClause = (filter: SQLFilter[]) => {
  if(filter && filter.length > 0) {

    const formatValue = (filter: SQLFilter) => {

    };

    return `
      WHERE
        ${filter.map((columnFilter: SQLFilter) => {
          return ` ${columnFilter.field} ${columnFilter.operator} ${columnFilter.value} `
        })
      }
    `
  } else {
    return '';
  }
};

export const MySQLQueryStringGenerator: QueryStringGenerator = {
  fromQuery: async (queryCommand: SQLQuery): Promise<QueryStringResultWithCount> => {
    logger.debug('Generating SQL Query using queryCommand', queryCommand);    
    let queryStringResultWithCount: QueryStringResultWithCount = {
      query: `
        SELECT
          ${queryCommand.columns.map((sqlColumn: SQLColumn, index: number) => {
            return `${sqlColumn.field}`
          })}
        FROM 
          ${queryCommand.context.schema}.${queryCommand.context.table}
        ${whereClause(queryCommand.filters)}
        LIMIT ${queryCommand.paging.pageSize || 100}
        OFFSET ${((queryCommand.paging.page || 1) - 1) * (queryCommand.paging.pageSize || 100)}
      `,
      count: 0
    };

    const countResult: any[] = await queryAsync(`
      SELECT 
        COUNT(1) as total
      FROM ${queryCommand.context.schema}.${queryCommand.context.table}
      ${whereClause(queryCommand.filters)}`, queryCommand.context.connectionId).then();

    queryStringResultWithCount.count = countResult[0].total;

    return queryStringResultWithCount;
  },
  fromInsert: (insertCommand: SQLInsert): string => {
    return `
      INSERT 
      ${insertCommand.columns.map((sqlColumn: SQLColumn, index: number) => {
        return `${sqlColumn.field} ${index < insertCommand.columns.length ? ',' : ''}`
      })}
      INTO
        ${insertCommand.context.table}
      VALUES (
        ${insertCommand.values.map((columnValue: any, cIndex: number) => {  
          return `'${columnValue}'`
        })}
      )
    `;
  },
  fromUpdate: (updateCommand: SQLUpdate): string => {
    return `
      UPDATE

      SET
      ${updateCommand.columns.map((sqlColumn: SQLColumn, index: number) => {
        return `${sqlColumn.field} ${index < updateCommand.columns.length ? ',' : ''}`
      })}
    `;
  },
  fromDelete: (deleteCommand: SQLDelete): string => {
    return `
      DELETE        
      FROM
        ${deleteCommand.context.table}      
        ${whereClause(deleteCommand.filter)}
    `;
  },  
};

export const queryAsync = async (query: string, connectionId: string = 'mysql.default', values?: any ) => {
  logger.debug('queryAsync', { query, connectionId });

  return new Promise((resolve, reject) => {
    const resultCallback = (error: MysqlError, results?: any, fields?: FieldInfo[]) => {
      logger.debug(`Results from query`, { error, fields } )
      if (error === null || error === undefined) {
        resolve(results);
      } else {
        reject(error);
      }
    };
    const connection =  getConnection(connectionId);
    if(connection) {
      
      connection.query( { sql: query, values  }, resultCallback);
      
    } else {
      reject(new ApiError(`Could not establish a connection using the connection details for ${connectionId}`));
    }
      
  });  
};


