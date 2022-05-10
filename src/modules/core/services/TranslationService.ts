import { Reactory } from "@reactory/server-core/types/reactory";
import Hash from '@reactory/server-core/utils/hash';
import { roles } from '@reactory/server-core/authentication/decorators';
import moment from 'moment';
import { QueryWithHelpers } from 'mongoose';
import ReactoryTranslation from '../models/ReactoryTranslation';

class ReactoryTranslationService implements Reactory.Service.IReactoryTranslationSerivce {
  
  name: string;
  nameSpace: string;
  version: string;

  props: Reactory.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext;

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  async getTranslations(locale?: string): Promise<Reactory.IReactoryTranslations> {
    
    let translations: Reactory.IReactoryTranslations = {
      id: locale,
      locale,
      resources: {},
      translations: []
    };

    translations.translations = await ReactoryTranslation.find({ locale: locale, partner: this.context.partner as Reactory.IReactoryClientDocument }).then()
    
    return translations;
  }
  
  async setTranslation(translation: Reactory.IReactoryTranslation): Promise<Reactory.IReactoryTranslation> {    
    let $translation: Reactory.IReactoryTranslation = null;

    return $translation;
  }
  
  async removeTranslation(translation: Reactory.IReactoryTranslation): Promise<Reactory.IReactoryTranslation> {
    // throw new Error("Method not implemented.");

    return null;
  }
  
  async getResource(translation: Reactory.IReactoryTranslation): Promise<any> {
    // throw new Error("Method not implemented.");
    let resource: any = {};

    return resource;
  }
  
  async getResources(translations: Reactory.IReactoryTranslations): Promise<any> {
    // throw new Error("Method not implemented.");
    let resources: any = {};
    const that = this;

  
    
    return resources;
  }

  async loadCoreTranslations():Promise<Reactory.IReactoryTranslations[]>{
    let translations: Reactory.IReactoryTranslations[];
    const { context } = this;
    const that = this;
    async function* processTranslations(){
      for (let i: number = 0; i < translations.translations.length; i++) {
        const translation: Reactory.IReactoryTranslation = translations.translations[i];

        if (translation) {
          yield that.setTranslation(translation);
        }
      }
    }

    context.modules.forEach((reactoryModule: Reactory.Server.IReactoryModule) => {
      context.log(`Loading Translations For Module ${reactoryModule.nameSpace}.${reactoryModule.name}@${reactoryModule.version}`);
      if (reactoryModule.translations && reactoryModule.translations.length > 0) {
        reactoryModule.translations.forEach((translations: Reactory.IReactoryTranslation) => {
          
        });
      }
    });

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
  
  static reactory: Reactory.IReactoryServiceDefinition = {
    id: "core.ReactoryTranslationService@1.0.0",
    name: "Translation Service",
    description: "Translation Service for translation",
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
      return new ReactoryTranslationService(props, context);
    }
  }
}