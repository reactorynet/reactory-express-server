'use strict'
// The below import may indicate not found before your first 
// compile / run is done as it is generated at startup based on the configuration.
import * as fs from 'fs';


let resolved: Reactory.Server.IReactoryModule[] = [];
const files = [
  `./${process.env.APPLICATION_ROOT || 'src'}/modules/__index.ts`,
  `./${process.env.APPLICATION_ROOT || 'src'}/modules/__index.js`,
];

if (files.some(file => fs.existsSync(file))) {
  resolved = require('./__index').default;
}

const available = require('./available.json');

export default {
  available,
  enabled: resolved,
};
