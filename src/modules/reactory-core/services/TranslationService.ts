import Reactory from '@reactory/reactory-core';
import i18n from "i18next";
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

  async getTranslations(locale?: string): Promise<Reactory.Models.IReactoryTranslations> {
    
    let translations: Reactory.Models.IReactoryTranslations = {
      id: locale,
      locale,
      resources: {},
      translations: [],
      i18n: [],
    };

    // translations.translations = await ReactoryTranslation.find({ locale: locale, partner: this.context.partner as Reactory.IReactoryClientDocument }).then()
    
    // return translations;

    const {
      i18n
    } = this.context;

    if(i18n.language !== locale) {
      await i18n.changeLanguage(locale);
    }
    
    const ns: string | readonly string[] | null = i18n.options.ns;

    let bundles: Reactory.Models.IReactoryI18nResource[] = []

    if(this.context.utils.lodash.isArray(ns) === true) {
      (ns as string[]).forEach($ns => {
        const resourceBundle = i18n.getResourceBundle(i18n.language, $ns);    
        bundles.push({ id: `${locale}.${$ns}`, ns: $ns, translations: resourceBundle });
      });

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