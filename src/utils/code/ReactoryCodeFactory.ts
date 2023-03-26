"use strict";
/**
 * The code factory is collect and provide a unified interface all code generating capabilities
 * 
 * Currently the factory are only used to generate index files for the client configs and
 * the module imports.
 */
import ModuleImportFactory from '@reactory/server-core/modules/helpers/moduleImportFactory'
import ClientConfigsImportFactory from '@reactory/server-core/data/clientConfigs/helpers/configImportFactory';


export const ReactoryCodeFactory = {
  ModuleImportGenerator: () => {
    ModuleImportFactory();
  },
  ClientConfigImportGenerator: () => {
    ClientConfigsImportFactory();
  },
};

