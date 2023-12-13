import i18next from 'i18next';
import i18nextHttp from 'i18next-http-middleware';
import i18nextFSBackend from 'i18next-fs-backend';
import logger from "logging";
import { getModuleDefinitions } from "@reactory/server-core/modules/helpers/moduleImportFactory";

const {
  APP_DATA_ROOT = "",
  I18N_NS = ""
} = process.env as Reactory.Server.ReactoryEnvironment;

const DEFAULT_I18N_NAMESPACES = ['common', 'forms', 'models', 'services', 'workflow', 'schemas', 'cli'];

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


const backendOptions = {
  // load all translations found in the modules.
  loadPath: `${APP_DATA_ROOT}/i18n/{{lng}}/{{ns}}.json`,
  addPath: `${APP_DATA_ROOT}/i18n/{{lng}}/{{ns}}.missing.json`
};

i18next
  .use(i18nextHttp.LanguageDetector)
  .use(i18nextFSBackend)
  .init({
    preload: ['en-US', 'af'],
    lng: "en-US",
    fallbackLng: 'en-US',
    ns: getNamesSpaces(),
    backend: backendOptions
  });

export default i18next;