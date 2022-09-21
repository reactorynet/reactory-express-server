import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'

interface IReactoryTranslantionParams {
  lang: string
}

@resolver
class ReactoryTranslationResolver {

  resolver: any;

  @roles(["USER"], 'args.context')
  @query("ReactoryTranslation")
  async ReactoryTranslation(obj: any,
    params: IReactoryTranslantionParams, 
    context: Reactory.Server.IReactoryContext,
    ): Promise<Reactory.Models.IReactoryTranslations> {
      const { lang } = params;
      const { i18n } = context;
      const translateSvc: Reactory.Service.TReactoryTranslationService = context.getService("core.ReactoryTranslationService@1.0.0") as Reactory.Service.TReactoryTranslationService;
      return translateSvc.getTranslations(lang || i18n.language)
  }
}

export default ReactoryTranslationResolver;