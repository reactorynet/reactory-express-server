/**
 * Responsible for generating the __index.ts
 * imports file for the modules we want to run.
 */
import fs from 'fs';
import path from 'path';
import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';

const getImportName = (moduleDefinition: Reactory.Server.IReactoryModuleDefinition) => {

  let $import_name = moduleDefinition.fqn.replace(/\./g, '_',);
  $import_name = $import_name.replace(/-/, '__');
  $import_name = $import_name.replace('@', '_VER_');

  return $import_name;
};

const resolveModulesFolder = (): string => {   
  const DEVELOPMENT_PATH = path.join(process.cwd(), `src/modules`);
  const PRODUCTION_PATH = path.join(process.cwd(), `app/modules`);
  let folder = "";
  if (fs.existsSync(DEVELOPMENT_PATH)) { 
    folder = DEVELOPMENT_PATH;
  } else if (fs.existsSync(PRODUCTION_PATH) === true) { 
    folder = PRODUCTION_PATH;
  }
  return folder;
}

const getModuleDefinitionsFile = (): string => { 
  const { MODULES_ENABLED } = process.env;
  const folder = resolveModulesFolder();
  const DEVELOPMENT_PATH = path.join(folder, `${MODULES_ENABLED}.json`);
  const PRODUCTION_PATH = path.join(folder, `${MODULES_ENABLED}.json`);  
  let filename = "";
  if (fs.existsSync(DEVELOPMENT_PATH)) { 
    filename = DEVELOPMENT_PATH;
  } else if (fs.existsSync(PRODUCTION_PATH) === true) { 
    filename = PRODUCTION_PATH;
  }
  return filename;
}

export const getModuleDefinitions = (): Reactory.Server.IReactoryModuleDefinition[] => {
  const filename = getModuleDefinitionsFile();  
  let enabled: Reactory.Server.IReactoryModuleDefinition[] = []
  if (fs.existsSync(filename) === true) {
    enabled = require(filename);
  } else {
    throw new Error(`The module specification file (${filename}) does not exist, please create it and restart the server`);    
  }
  return enabled;
}

const generateHeader = () => { 
  return `
/** 
 * ©️ Reactory Server - Generated Code - Do not modify!
 * CODE-GENERATED: Do not modify! 
 * 
 * This file is generated with each startup, do not modify or check into the repo.
 * See the readme.md in the modules folder for more details.
 * */
"use strict";
`;
};

const generateImport = (moduleDefinition: Reactory.Server.IReactoryModuleDefinition) => { 
  let import_name = getImportName(moduleDefinition);
  return `
import ${import_name} from '@reactory/server-modules/${moduleDefinition.moduleEntry.replace('.ts', '').replace('.js', '')}';`;
};


/**
 * Generates __index.ts that is responsible for module includes.
 */
const generate_index = () => {
  const { MODULES_ENABLED } = process.env;
  logger.debug(`#### REACTORY CODE - ModleImportFactory ####\n🟠  ModuleImportFactory >> __index.ts generator executing for module spec ${MODULES_ENABLED || 'NA'}`);

  const filename = getModuleDefinitionsFile();
  let enabled: Reactory.Server.IReactoryModuleDefinition[] = []
  if (fs.existsSync(filename) === true) {
    enabled = require(filename);
  } else {
    logger.error(`The module specification file (${filename}) does not exist, please create it and restart the server`);
    process.exit(0);
  }

  logger.debug(`Found ${enabled.length} module definintions in ${filename}`);

  let file_contents = generateHeader();

  let module_names = '';
  enabled.forEach((moduleDefinition: Reactory.Server.IReactoryModuleDefinition, midx: number) => {
    logger.debug(`Enabling Reactory Module ⚙ [${moduleDefinition.name}]`);
    // eslint-disable-next-line global-require

    let import_name = getImportName(moduleDefinition);

    file_contents = `${file_contents}` + generateImport(moduleDefinition);
    module_names = midx === 0 ? `\t${import_name}` : `${module_names},\n\t${import_name}`;
  });


  file_contents = `${file_contents}
  
export default [
${module_names}
];
`;

  const __index = path.join(resolveModulesFolder(), '__index.ts');
  let do_write = false;
  let file_exists = fs.existsSync(__index);
  if (file_exists === true) {
    const existing = fs.readFileSync(__index, { encoding: 'utf8' });
    do_write = existing !== file_contents;
  } else {
    do_write = true;
  }

  if (do_write === true) {
    if (file_exists === true) {
      fs.unlinkSync(__index);
    }
    fs.writeFileSync(__index, file_contents, { encoding: 'utf8' });
  }

  logger.debug(`#### REACTORY CODE - ModleImportFactory ####\n🟢 ModuleImportFactory >> __index.ts complete`);
};

export default generate_index;
