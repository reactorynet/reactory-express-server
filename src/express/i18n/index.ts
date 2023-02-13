import { getModuleDefinitions } from "@reactory/server-core/modules/helpers/moduleImportFactory";
import logger from "logging";


const {
  I18N_NS = ""
} = process.env as Reactory.Server.ReactoryEnvironment;

const DEFAULT_I18N_NAMESPACES = ['common', 'forms', 'models', 'services', 'workflow', 'schemas'];

/**
 * Returns all the i18n namespaces that needs to be loaded into the i18n provider.
 * The function will load the default namespaces which are 'common', 'forms', 'models', 'services', 'workflow', 'schemas'
 * as well as namespaces that match loaded module keys. 
 * i.e. if a module key is "foo", then "foo" namespace will be added to the language namespaces to be loaded.
 * Additional namespaces can be loaded by setting the additional namespace as a comma separated string in the 
 * I18N_NS envirionment variable.
 * @returns 
 */
export const getNamesSpaces = (): string[] => {
  let langNS = DEFAULT_I18N_NAMESPACES;

  getModuleDefinitions().forEach(def => {
    if (langNS.indexOf(def.key) < 0)
      langNS.push(def.key);
  });


  if (I18N_NS === "") return langNS;
  if (I18N_NS.indexOf(",") >= 0) {
    I18N_NS.split(',').forEach((ns) => {
      if (langNS.indexOf(ns) === -1) langNS.push(ns);
    });
  } else {
    if (I18N_NS.length > 0 && langNS.indexOf(I18N_NS) === -1) langNS.push(I18N_NS);
  }
  logger.debug(`Returning ${langNS.length} language namespaces:\n${langNS.map(ns => ``)}`)
  return langNS;
}