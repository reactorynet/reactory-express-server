import mysql from 'mysql';
import co from 'co';

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
  getPool(tenant).query('SELECT 1 + 1 AS solution', (error, results) => {
    if (error) throw error;
    console.log(results[0].solution.toString() === '2' ? 'Legacy DB Connected' : 'Legacy DB Not Connectioned');
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
