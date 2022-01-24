'use strict'
// The below import may indicate not found before your first 
// compile / run is done as it is generated at startup based on the configuration.
//@ts-ignore
import fs from 'fs';
import { Reactory } from 'types/reactory';



let resolved: Reactory.IReactoryModule[] = [];

if (fs.existsSync('./src/modules/__index.ts') === true) {
  resolved = require('./__index').default;
}

const available = require('./available.json');

export default {
  available,
  enabled: resolved,
};
