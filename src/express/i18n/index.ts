import path from 'path';
import i18next from 'i18next';
import i18nextFSBackend from 'i18next-fs-backend';
import logger from "@reactory/server-core/logging";
import { getModuleDefinitions } from "@reactory/server-core/modules/helpers/moduleImportFactory";
import {
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getI18nRoot,
  normaliseLanguage,
  resolveLocaleFolder,
} from './language';

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


const i18nRoot = getI18nRoot();

/**
 * Builds a bundle path resolver that maps the language *code* onto the folder
 * that actually holds it.
 *
 * The code is the filter identity (the selector, the bundle `locale`, the
 * `language` argument on the translations query); the folder is a storage
 * detail. A code with no folder of its own (`en` when the bundle lives in
 * `en-US/`) must still load, which a fixed `{{lng}}` template cannot express.
 */
const localeBundlePath = (suffix: string) => (lng: string, ns: string): string => {
  const folder = resolveLocaleFolder(lng) || normaliseLanguage(lng);
  return path.join(i18nRoot, folder, `${ns}${suffix}`);
};

const backendOptions = {
  // load all translations found in the modules.
  loadPath: localeBundlePath('.json'),
  addPath: localeBundlePath('.missing.json')
};

const defaultCode = normaliseLanguage(DEFAULT_LANGUAGE);

if (getAvailableLanguages().length > 0 && !resolveLocaleFolder(defaultCode)) {
  // Loud, not silent: with no folder for the default language, every request
  // that resolves to it (the selector still offers it) loads nothing.
  logger.error(
    `No locale folder matches the default language "${defaultCode}" under ${i18nRoot}`
    + ` — requests resolving to it would load no translations; add an ${defaultCode}/ folder.`
  );
}

/**
 * Options the i18next instance is initialised with.
 *
 * Exported so the reconciliation between the instance default and
 * `DEFAULT_LANGUAGE` can be asserted directly.
 */
export const i18nextInitOptions = {
  // Language codes — the same set the selector offers and the filter accepts.
  // The backend maps each code onto its folder via `localeBundlePath`.
  preload: getAvailableLanguages(),
  // The normalised code, matching what `resolveLanguage` returns for a request.
  // Derived from the same constant, so the instance default and
  // `DEFAULT_LANGUAGE` cannot drift.
  //
  // No language detector is registered: the request language is resolved from
  // the headers in `ReactoryContext` (preferring `x-reactory-language`), and
  // `lng` is always passed explicitly, so a detector would be a second,
  // divergent path — it reads only `accept-language`.
  lng: defaultCode,
  fallbackLng: defaultCode,
  ns: getNamesSpaces(),
  backend: backendOptions
};

// `i18next.init` mutates the options it is given (it normalises `fallbackLng`
// into an array), so hand it a copy and keep the exported object as authored.
i18next.use(i18nextFSBackend).init({ ...i18nextInitOptions });

export default i18next;
