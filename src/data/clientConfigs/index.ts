
import fs from 'fs';

let enabled_clients: Reactory.Server.IReactoryClientConfig[] = [];

if (fs.existsSync('./src/data/clientConfigs/__index.ts')) {
  enabled_clients = require('./__index').default;
}


export default enabled_clients;