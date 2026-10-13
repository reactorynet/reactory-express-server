import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { normaliseLanguage } from '@reactory/server-core/express/i18n/language';

interface IReactoryTranslantionParams {
  lang: string
}

@resolver
class ReactoryTranslationResolver {

  resolver: any;

  @roles(["USER", "ANON"], 'args.context')
  @query("ReactoryTranslation")
  async ReactoryTranslation(obj: any,
    params: IReactoryTranslantionParams, 
    context: Reactory.Server.IReactoryContext,
    ): Promise<Reactory.Models.IReactoryTranslations> {
      const { lang } = params;
      const { i18n } = context;
      const translateSvc: Reactory.Service.TReactoryTranslationService = context.getService("core.ReactoryTranslationService@1.0.0") as Reactory.Service.TReactoryTranslationService;
      const result = await translateSvc.getTranslations(lang || i18n.language);
      
      const fs = require('fs');
      const path = require('path');
      const APP_DATA_ROOT = process.env.APP_DATA_ROOT || path.resolve(process.cwd(), '../reactory-data');
      // Normalised so a regional tag (af-ZA) matches the af bundle folder,
      // consistent with how the translation service resolves a locale.
      const locale = normaliseLanguage(lang || i18n.language);

      if (result && result.i18n && Array.isArray(result.i18n)) {
        result.i18n.forEach((bundle: any) => {
          const $ns = bundle.ns;
          const candidates = [
            path.resolve(APP_DATA_ROOT, `i18n/${locale}/${$ns}.json`),
            path.resolve(APP_DATA_ROOT, `i18n/en/${$ns}.json`),
            path.resolve(APP_DATA_ROOT, `i18n/en-US/${$ns}.json`),
          ];
          for (const filePath of candidates) {
            if (fs.existsSync(filePath)) {
              try {
                const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                bundle.translations = { ...(bundle.translations || {}), ...fileContent };
              } catch (e) {}
              break;
            }
          }
        });
      }

      return result;
  }
}

export default ReactoryTranslationResolver;