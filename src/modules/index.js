import path from 'path';
import logger from '../logging';

const available = require('./available.json');
const enabled = require('./enabled.json');

const resolved = [];

enabled.forEach((moduleDefinition) => {
  logger.debug(`Module [${moduleDefinition.name}] - Loading`);
  try {
    const resolvedItem = require(path.resolve(path.join('src', 'modules', `${moduleDefinition.moduleEntry}`))).default;
    resolved.push(resolvedItem);
  } catch (pluginLoadError) {
    logger.error('Could not load pluging', moduleDefinition);
  }  
});


export default {
  available,
  enabled: resolved,
};
