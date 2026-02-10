import DatabaseGenerators from './database';
import ModuleGenerator from './module/ModuleGenerator';
import ServiceGenerator from './service';

export default [
  ...DatabaseGenerators,
  ModuleGenerator,
  ServiceGenerator,
];