'use strict'
// The below import may indicate not found before your first 
// compile / run is done as it is generated at startup based on the configuration.
import * as fs from 'fs';


let resolved: Reactory.Server.IReactoryModule[] = [];
const appRoot = process.env.APPLICATION_ROOT || 'src';
const files = [
  `./${appRoot}/modules/__index.ts`,
  `./${appRoot}/modules/__index.js`,
  `./src/modules/__index.ts`,
  `./src/modules/__index.js`,
  `./app/modules/__index.ts`,
  `./app/modules/__index.js`,
];

if (files.some(file => fs.existsSync(file))) {
  resolved = require('./__index').default;
}

const available = require('./available.json');

export default {
  available,
  enabled: resolved,
};
