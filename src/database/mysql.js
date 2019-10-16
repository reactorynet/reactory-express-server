import mysql from 'mysql';
import co from 'co';
import logger from '../logging';
import ApiError from '../exceptions';

let pool = null;

const defaultConnectionObject = {
  host: 'localhost',
  database: 'reactory',
  user: 'reactory',
  password: 'reactory',
  port: 3306,  
};

export const getPool = (database = 'plc', host = 'localhost', user = 'towerstone', password = process.end.DATABASE_PASSWORD_LEGACY, port = 3306, clientKey = 'plc') => {
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
  
export const queryAsync = async (query, connectionId = 'mysql.default') => {
  logger.debug('queryAsync', { query, connectionId });

  return new Promise((resolve, reject) => {
    const resultCallback = (error, results) => {
      if (error === null || error === undefined) {
        resolve(results);
      } else {
        reject(error);
      }
    };
    const connection =  getConnection(connectionId);
    if(connection) {
      connection.query(query, resultCallback);
    } else {
      reject(new ApiError(`Could not establish a connection using the connection details for ${connectionId}`));
    }
      
  });  
};


