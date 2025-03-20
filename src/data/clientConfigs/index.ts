
import fs from 'fs';

const {
  APPLICATION_ROOT = 'src',
  NODE_ENV = 'development'
} = process.env;
const enabled_clients: Reactory.Server.IReactoryClientConfig[] = [];
if (fs.existsSync(`./${APPLICATION_ROOT}/data/clientConfigs/__index.${NODE_ENV === 'development' ? 'ts' : 'js'}`)) {
  const clientConfigs = require(`./__index.${NODE_ENV === 'development' ? 'ts' : 'js'}`).default || [];
  enabled_clients.push(...clientConfigs);
}
export default enabled_clients;