import MySQLFormGenerator from './mysql';
import SqlServerFormGenerator from './sqlserver';

export default [
  {
    id: 'generators.MySQLFormGenerator',
    generate: MySQLFormGenerator
  },
  {
    id: 'generators.SQLServerSQLFormGenerator',
    generate: SqlServerFormGenerator
  }
];
