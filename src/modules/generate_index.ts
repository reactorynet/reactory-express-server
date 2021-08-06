/**
 * Responsible for generating the __index.ts
 * imports file for the modules we want to run.
 */
import fs from 'fs';
import { Reactory } from 'types/reactory';
import logger from '@reactory/server-core/logging';

const getImportName = (moduleDefinition: Reactory.IReactoryModuleDefinition) => {

  let $import_name = moduleDefinition.fqn.replace(/\./g, '_',);
  $import_name = $import_name.replace(/-/, '__');
  $import_name = $import_name.replace('@', '_VER_');

  return $import_name;
};

const generate_index = () => {

  const enabled = require(`./${process.env.MODULES_ENABLED || 'enabled'}.json`);

  const resolved: any = [];

  let file_contents = `
/**
 * This file is generated with each startup, do not modify or check into the repo.
 * See the readme.md in the modules folder for more details.
 * */
'use strict'`;

  let module_names = '';
  enabled.forEach((moduleDefinition: Reactory.IReactoryModuleDefinition, midx: number) => {
    logger.debug(`Loading [${moduleDefinition.name}] ⭕`);
    // eslint-disable-next-line global-require

    let import_name = getImportName(moduleDefinition);

    file_contents = `${file_contents}

/**
 * Generated import for module id ${moduleDefinition.id}
 * */ 
import ${import_name} from '@reactory/server-modules/${moduleDefinition.moduleEntry.replace('.ts', '').replace('.js', '')}';`;
    module_names = midx === 0 ? `\t${import_name}` : `${module_names},\n\t${import_name}`;
  });


  file_contents = `${file_contents}
  
export default [
${module_names}
];
`;

  const __index = './src/modules/__index.ts';
  let do_write = false;
  if (fs.existsSync(__index) === true) {
    const existing = fs.readFileSync(__index, { encoding: 'utf8' });
    do_write = existing !== file_contents;
  } else {
    do_write = true;
  }


  if (do_write === true) fs.writeFileSync(__index, file_contents, { encoding: 'utf8' });
};

export default generate_index;
