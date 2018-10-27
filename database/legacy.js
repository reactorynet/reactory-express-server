import mysql from 'mysql';
import co from 'co';
import logger from '../logging';

let pool = null;

export const getPool = (database = 'plc', host = 'localhost', user = 'towerstone', password = process.end.DATABASE_PASSWORD_LEGACY, port = 3306, clientKey = 'plc') => {
  if (pool === null) {
    pool = mysql.createPool({
      connectionLimit: 100,
      host,
      user,
      password,
      database: clientKey || database,
      port,
    });
  }
  return pool;
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

export const querySync = co.wrap(function* querySync(query, options) {
  const requestWrapper = new Promise((resolve, reject) => {
    const resultCallback = (error, results) => {
      if (error === null || error === undefined) {
        resolve(results);
      } else {
        reject(error);
      }
    };
    if (options && options.log) console.log('Executing query: ', query, options);
    getPool(typeof options === 'object' ? { ...options } : options).query(query, resultCallback);
  });

  const result = yield requestWrapper.then();

  return result;
});
