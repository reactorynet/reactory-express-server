/* eslint-disable import/no-dynamic-require */
import path from 'path';
import { Reactory } from 'types/reactory';
import logger from '../logging';

const available = require('./available.json');

const enabled = require(`./${process.env.MODULES_ENABLED || 'enabled'}.json`);

const resolved: any = [];

enabled.forEach((moduleDefinition: Reactory.IReactoryModuleDefinition) => {
  logger.debug(`Loading [${moduleDefinition.name}] ⭕`);
  // eslint-disable-next-line global-require
  const resolvedItem = require(path.resolve(path.join('src', 'modules', `${moduleDefinition.moduleEntry}`))).default; // @ts-ignore // es-lint:disable-line
  resolved.push(resolvedItem);
  logger.debug(`Loading [${moduleDefinition.name}] ✅`);
});


export default {
  available,
  enabled: resolved,
};
