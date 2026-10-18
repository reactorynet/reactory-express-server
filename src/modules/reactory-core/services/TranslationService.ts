import Reactory from '@reactorynet/reactory-core';
import i18n from "i18next";
import {
  getAvailableLanguages,
  resolveLanguage,
} from '@reactory/server-core/express/i18n/language';
import {
  bundleFromTranslations,
  resolveTranslationBundle,
} from '@reactory/server-core/express/i18n/translationLayers';
import { ReactoryTranslations } from '@reactory/server-modules/reactory-core/types/Translation';
import modules from '@reactory/server-core/modules';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';
interface IUserTranslationMap {
  [key: string]: number
}
export default class ReactoryTranslationService implements Reactory.Service.IReactoryTranslationService {
  
  name: string;
  nameSpace: string;
  version: string;

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext;
  
  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  async init(): Promise<boolean> {

    try { 
      await this.updateCacheForUser();
    } catch (e) {
      this.context.error(`Error initializing the translation services for the user ${this.context?.user?.firstName}`, { error: e }, ReactoryTranslationService.reactory.id)
    }
    return true;
  }
 
  async updateCacheForUser() {
    const { user } = this.context;
    
    const { enabled } = modules;
    let resources: any = {};

    if (enabled && enabled.length > 0) {
      enabled.forEach((mod: Reactory.Server.IReactoryModule) => {
        if (mod.translations) {
          mod.translations.forEach((translation) => {
            const { locale, translations } = translation;
            if (!resources[locale]) {
              resources[locale] = {}
            }

            translations.forEach((translation) => {
              if (resources[locale][translation.key] === undefined) {
                resources[locale][translation.key] = translation.translation;
              }
            })
          })
        }
      });
    }
    
    i18n.init({
      resources,
      lng: user?.il8n?.locale || ENVIRONMENT.DEFAULT_LOCALE,
    });
  }

  /**
   * Reads the CMS-persisted translations for one locale/namespace pair.
   *
   * Wrapped and best-effort on purpose: translation reads must not fail because
   * Mongo is unavailable (CLI commands and unit tests run without a
   * connection), and an unreadable store should fall back to the shipped
   * bundles rather than serve nothing.
   */
  private async cmsTranslations(locale: string, ns: string): Promise<any> {
    try {
      const mongoose = require('mongoose');
      if (!mongoose || !mongoose.connection || mongoose.connection.readyState !== 1) return {};

      const { default: ReactoryTranslation } = require('@reactory/server-modules/reactory-core/models/ReactoryTranslation');
      if (!ReactoryTranslation || typeof ReactoryTranslation.find !== 'function') return {};

      const query: any = { locale };
      if (ns) query.namespace = ns;

      const rows = await ReactoryTranslation.find(query).lean().exec();
      return bundleFromTranslations(rows);
    } catch (error) {
      return {};
    }
  }

  async getTranslations(locale?: string): Promise<ReactoryTranslations> {
    
    // Normalised so a regional tag (af-ZA) resolves against the af bundles,
    // matching how translatable content is keyed.
    const resolvedLocale = resolveLanguage(locale || this.context?.i18n?.language);

    let translations: ReactoryTranslations = {
      id: resolvedLocale,
      locale: resolvedLocale,
      resources: {},
      translations: [],
      i18n: [],
      languages: getAvailableLanguages(),
    };

    // translations.translations = await ReactoryTranslation.find({ locale: locale, partner: this.context.partner as Reactory.IReactoryClientDocument }).then()
    
    // return translations;

    const {
      i18n
    } = this.context;

    // Deliberately no changeLanguage call here. This used to mutate whichever
    // instance the context held — the process-wide one — so a single caller's
    // request changed the language every other caller rendered in. The bundle
    // below is read for resolvedLocale explicitly and needs no active language.
    
    let ns: string[] = [];
    if (i18n && i18n.options && Array.isArray(i18n.options.ns)) {
      ns = i18n.options.ns as string[];
    } else {
      try {
        const { getNamesSpaces } = require('@reactory/server-core/express/i18n');
        ns = getNamesSpaces();
      } catch (err) {
        ns = ['common', 'forms', 'models', 'services', 'workflow', 'schemas', 'cli', 'reactory'];
      }
    }

    const fs = require('fs');
    const path = require('path');
    const APP_DATA_ROOT = process.env.APP_DATA_ROOT || process.env.REACTORY_DATA || path.resolve(process.cwd(), '../reactory-data');

    let bundles: Reactory.Models.IReactoryI18nResource[] = []

    if (Array.isArray(ns)) {
      for (const $ns of ns) {
        // The module layer: translations compiled into the loaded modules.
        // Lowest authority — it is the fallback for keys no bundle carries.
        const moduleBundle = { ...(i18n && typeof i18n.getResourceBundle === 'function' ? i18n.getResourceBundle(resolvedLocale, $ns) || {} : {}) };

        // The file layer: the shipped, reviewed bundle for this locale. The
        // candidates are ordered by intent — the locale itself, then the
        // default language, then the regional English folder that the loader
        // uses as a last resort when `en/` is absent. The first existing file
        // wins, exactly as the backend loader resolves folders.
        const candidates = [
          path.resolve(APP_DATA_ROOT, `i18n/${resolvedLocale}/${$ns}.json`),
          path.resolve(APP_DATA_ROOT, `i18n/en/${$ns}.json`),
          path.resolve(APP_DATA_ROOT, `i18n/en-US/${$ns}.json`),
        ];
        let fileBundle: any = {};
        for (const filePath of candidates) {
          if (fs.existsSync(filePath)) {
            try {
              fileBundle = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {}
            break;
          }
        }

        // The CMS layer: rows a translator/editor persisted through the CMS.
        // Highest authority, so a CMS correction is never shadowed by a file.
        const cmsBundle = await this.cmsTranslations(resolvedLocale, $ns);

        const resourceBundle = resolveTranslationBundle({
          module: moduleBundle,
          file: fileBundle,
          cms: cmsBundle,
        });

        bundles.push({ id: `${resolvedLocale}.${$ns}`, ns: $ns, translations: resourceBundle });
      }

      translations.i18n = bundles;
    }
      
    return translations;
  }
  
  async setTranslation(translation: Reactory.Models.IReactoryTranslation): Promise<Reactory.Models.IReactoryTranslation> {    
    let $translation: Reactory.Models.IReactoryTranslation = null;

    return $translation;
  }
  
  async removeTranslation(translation: Reactory.Models.IReactoryTranslation): Promise<Reactory.Models.IReactoryTranslation> {
    // throw new Error("Method not implemented.");

    return null;
  }
  
  async getResource(translation: Reactory.Models.IReactoryTranslation): Promise<any> {
    // throw new Error("Method not implemented.");
    let resource: any = {};

    return resource;
  }
  
  async getResources(translations: Reactory.Models.IReactoryTranslations): Promise<any> {
    // throw new Error("Method not implemented.");
    let resources: any = {};
    const that = this;

    return resources;
  }

  setTranslations(translations: Reactory.Models.IReactoryTranslations): Promise<Reactory.Models.IReactoryTranslations> {
    throw new Error('Method not implemented.');
  }


  translate(key: string, params?: any): string {
    this.context.log(`Translating ${key} with params:`, params, 'debug', ReactoryTranslationService.reactory.id);
    if(i18n.isInitialized === true) {
      return i18n.t(key, params);
    }
  }

  async loadTranslations():Promise<Reactory.Models.IReactoryTranslations[]>{
    let translations: Reactory.Models.IReactoryTranslations[];
    const { context } = this;
    const that = this;
    
    async function* processTranslations(){
    

      context.modules.forEach((reactoryModule: Reactory.Server.IReactoryModule) => {
        if(reactoryModule.translations) {
          reactoryModule.translations.forEach((t => translations.push(t)));
        }        
      });

      for (let i: number = 0; i < translations.length; i++) {
        const translation: Reactory.Models.IReactoryTranslations = translations[i];
        if (translation) {
          yield that.setTranslations(translation);
        }
      }
    }

    for await (const $translation of processTranslations())

    return translations;
  }

  onStartup(): Promise<any> {
    /**
     * load base translation
     */
    
    return Promise.resolve(true);    
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }
  
  static reactory: Reactory.Service.IReactoryServiceDefinition<ReactoryTranslationService> = {
    id: "core.ReactoryTranslationService@1.0.0",
    nameSpace: "core",
    version: "1.0.0",
    name: "ReactoryTranslationService",
    description: "Translation Service for translation",
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
      return new ReactoryTranslationService(props, context);
    }
  }
}