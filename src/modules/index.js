import path from 'path';
import logger from '../logging';

const available = require('./available.json');
const enabled = require('./enabled.json');

const resolved = [];

enabled.forEach((moduleDefinition) => {
  logger.debug(`Module [${moduleDefinition.name}] - Loading`);
  const resolvedItem = require(path.join('modules', `${moduleDefinition.moduleEntry}`)).default;

  resolved.push(resolvedItem);
});


export default {
  available,
  enabled: resolved,
};
