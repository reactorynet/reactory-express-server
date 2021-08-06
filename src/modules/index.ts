/* eslint-disable import/no-dynamic-require */
import path from 'path';
import { Reactory } from 'types/reactory';
import logger from '../logging';
import resolved from './__index';
const available = require('./available.json');

export default {
  available,
  enabled: resolved,
};
