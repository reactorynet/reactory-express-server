import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { resolveLanguage } from '@reactory/server-core/express/i18n/language';
import { resolveTranslationBundle } from '@reactory/server-core/express/i18n/translationLayers';

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
      // Resolved against the configured locales rather than normalised: this
      // value is interpolated into a filesystem path below, and `lang` is
      // caller-supplied on an ANON-reachable query. Normalising alone leaves
      // `/` and `.` intact, so `lang: "../../etc"` escaped APP_DATA_ROOT.
      const locale = resolveLanguage(lang || i18n.language);

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
                // The service already merged module + file + CMS values, so
                // its output is the higher-authority layer. Spreading the raw
                // file over it (the old behaviour) let a committed JSON bundle
                // shadow a CMS edit — see `express/i18n/translationLayers`.
                bundle.translations = resolveTranslationBundle({
                  file: fileContent,
                  cms: bundle.translations,
                });
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