import DatabaseGenerators from './database';
import ModuleGenerator from './module/ModuleGenerator';
export default [
  ...DatabaseGenerators,
  ModuleGenerator,
];