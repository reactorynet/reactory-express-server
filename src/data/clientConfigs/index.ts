
import fs from 'fs';

let enabled_clients: string[] = [];

if (fs.existsSync('./src/data/clientConfigs/__index.ts')) {
  enabled_clients = require('./__index').default;
}


export default enabled_clients;