/**
 * The forms collate all forms from all enabled modules and exports them in a singular array for export.
 */

import { isArray } from 'lodash';
import logger from '@reactory/server-core/logging';
import modules from '@reactory/server-core/modules';
import { Reactory } from '@reactory/server-core/types/reactory';

let _forms: Reactory.IReactoryForm[] = [];

const getModuleForms = () => {
  _forms = [];
  modules.enabled.forEach((module) => {
    logger.debug(`🗄 Loading ${module.name} Forms`);
    if (isArray(module.forms) === true) {
      module.forms.forEach((form) => {
        logger.debug(`♻ ${form.nameSpace}.${form.name}@${form.version}  `);
        _forms.push(form);
      });
    }
  });

  return _forms;
};

export default [
  ...getModuleForms(),
];
