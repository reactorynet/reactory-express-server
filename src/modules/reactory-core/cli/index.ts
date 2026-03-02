import SchemaGenCli from './schema-gen/SchemaGen';
import InitializeSystemUser from './init/InitializeSystemUser';
import Csv2JsonCliDefinition from './csv2json/csv2json';
import ServiceGenCli from './service-gen/ServiceGen';
import SecurityCliDefinition from './security/SecurityCli';

export default [
  SchemaGenCli,
  InitializeSystemUser,
  Csv2JsonCliDefinition,
  ServiceGenCli,
  SecurityCliDefinition,
];