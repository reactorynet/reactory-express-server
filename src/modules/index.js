import path from 'path';
import logger from '../logging';

const available = require('./available.json');
const enabled = require(`./${process.env.MODULES_ENABLED || 'enabled'}.json`);

const resolved = [];
const failed = [];

enabled.forEach((moduleDefinition) => {
  logger.debug(`Module [${moduleDefinition.name}] - Loading`);
  //try {
    const resolvedItem = require(path.resolve(path.join('src', 'modules', `${moduleDefinition.moduleEntry}`))).default;
    resolved.push(resolvedItem);
  //} catch (pluginLoadError) {
  //  failed.push({ moduleDefinition, reason: pluginLoadError.message || 'Module Could not resolve, check imports' });
  //  logger.error(`Could not load module ${moduleDefinition.name}`, { pluginLoadError });
  //}  
});


export default {
  available,
  enabled: resolved,
};
