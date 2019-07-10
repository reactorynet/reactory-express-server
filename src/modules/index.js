import path from 'path';
import logger from '../logging';

const available = require('./available.json');
const enabled = require('./enabled.json');

const resolved = [];

enabled.forEach((moduleDefinition) => {
  // debugger; //eslint-disable-line
  logger.debug(`Module Definition ${moduleDefinition.name}`, moduleDefinition);
  const resolvedItem = require(path.join('modules', `${moduleDefinition.moduleEntry}`)).default;
  logger.debug(`Module Definition ${moduleDefinition.name}`, resolvedItem);
  resolved.push(resolvedItem);
});


export default {
  available,
  enabled: resolved,
};
