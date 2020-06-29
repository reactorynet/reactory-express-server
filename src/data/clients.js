import * as dotenv from 'dotenv';
import reactoryConfig from './clientConfigs/reactory';
import towerstonConfig from './clientConfigs/towerstone';
import mores from './clientConfigs/mores';
import plcConfig from './clientConfigs/plc';
import lasecCrm from './clientConfigs/lasec-crm';
import thinklead from './clientConfigs/thinklead';

dotenv.config();

export default [
  reactoryConfig, towerstonConfig, mores, plcConfig, lasecCrm, thinklead
];
