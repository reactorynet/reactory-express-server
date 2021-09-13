"use strict";

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

