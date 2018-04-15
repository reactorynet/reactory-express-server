import mysql from 'mysql';

let pool = null;

export const getPool = (database = 'plc', host = 'localhost', user = 'towerstone', password = process.end.DATABASE_PASSWORD_LEGACY, port = 3306) => {
  if (pool === null) {
    pool = mysql.createPool({
      connectionLimit: 100,
      host,
      user,
      password,
      database,
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
