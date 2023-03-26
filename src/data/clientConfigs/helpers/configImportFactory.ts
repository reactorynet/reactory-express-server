/**
 * Responsible for generating the src/data/clientConfigs/__index.ts file 
 */
import fs from 'fs';
import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';

const getImportName = (clientName: string) => {

  let $import_name = clientName.replace(/\./g, '_',);
  $import_name = $import_name.replace(/-/, '__');

  return $import_name;
};

/**
 * Generates __index.ts that is responsible for module includes.
 */
const configImportFactory = () => {
  const { MODULES_ENABLED, CLIENTS_ENABLED } = process.env;

  logger.debug(`♻ src/data/clientConfig/__index.ts generator executing for module / client spec ${CLIENTS_ENABLED || MODULES_ENABLED || 'enabled'}`);
  const filename = `${CLIENTS_ENABLED || MODULES_ENABLED || 'enabled'}.json`

  let enabled: string[] = []
  if (fs.existsSync(`./src/data/clientConfigs/${filename}`) === true) {
    enabled = require(`../${filename}`);
  } else {
    logger.error(`The enabled clients json file specified (${filename}) does not exist, please create it and restart the server`);
    process.exit(0);
  }

  logger.debug(`Found ${enabled.length} client configs in ${filename}`);

  let file_contents = `
/**
 * This file is generated with each startup, do not modify or check into the repo.
 * See the readme.md in the src/data/clientConfigs/ folder for more details.
 * */
"use strict";`;

  let client_configuration_names = '';
  enabled.forEach((client_name: string, cidx: number) => {
    logger.debug(`Enabling Reactory Client with KEY 🔑 [${client_name}] `);
    // eslint-disable-next-line global-require

    let import_name = getImportName(client_name);

    file_contents = `${file_contents}

/**
 * Generated import for client configuration ${client_name}
 * */ 
import ${import_name} from '@reactory/server-core/data/clientConfigs/${client_name}/index';`;
    client_configuration_names = cidx === 0 ? `\t${import_name}` : `${client_configuration_names},\n\t${import_name}`;
  });


  file_contents = `${file_contents}
  
export default [
${client_configuration_names}
];

`;

  const __index = './src/data/clientConfigs/__index.ts';

  let do_write = false;
  const exists = fs.existsSync(__index) === true;
  if (exists === true) {
    const existing = fs.readFileSync(__index, { encoding: 'utf8' });
    do_write = existing !== file_contents;
  } else {
    do_write = true;
  }


  if (do_write === true) {
    if (exists === true) fs.unlinkSync(__index);

    fs.writeFileSync(__index, file_contents, { encoding: 'utf8' });
  }
};

export default configImportFactory;

