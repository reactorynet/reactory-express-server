import databaseGenerators from './database';
let _generatorMap = {};
databaseGenerators.forEach( generator => _generatorMap[generator.id] = generator.generate);
export const generators = _generatorMap;
export default generators;