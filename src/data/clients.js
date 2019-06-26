import * as dotenv from 'dotenv';
import reactoryConfig from './clientConfigs/reactory';
import towerstonConfig from './clientConfigs/towerstone';
import aotConfig from './clientConfigs/aot';
import plcConfig from './clientConfigs/plc';
import funisaveGW from './clientConfigs/funisaveGateway';
import boxcommerce from './clientConfigs/boxcommerce';
import lasecCrm from './clientConfigs/lasec-crm';

dotenv.config();

export default [
  reactoryConfig, towerstonConfig, aotConfig, plcConfig, funisaveGW, boxcommerce, lasecCrm,
];