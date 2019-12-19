import MySQLFormGenerator from './mysql';
import SqlServerFormGenerator from './sqlserver';
import { ReactoryFormGenerator } from '../types';

let generators: ReactoryFormGenerator[] = [];

generators.push({
    id: 'generators.MySQLFormGenerator',
    generate: MySQLFormGenerator
});

generators.push({
  id: 'generators.SQLServerSQLFormGenerator',
  generate: SqlServerFormGenerator
})

export default generators;