import * as dotenv from 'dotenv';
import reactoryConfig from './clientConfigs/reactory';
import towerstonConfig from './clientConfigs/towerstone';
import mores from './clientConfigs/mores';
import aotConfig from './clientConfigs/aot';
import plcConfig from './clientConfigs/plc';
import funisaveGW from './clientConfigs/funisaveGateway';
import boxcommerce from './clientConfigs/boxcommerce';
import lasecCrm from './clientConfigs/lasec-crm';
import evalue from './clientConfigs/evalue';
import thinklead from './clientConfigs/thinklead';

dotenv.config();

export default [
  reactoryConfig, towerstonConfig, mores, plcConfig, lasecCrm, evalue, thinklead
];
