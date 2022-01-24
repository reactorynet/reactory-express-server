import { Reactory } from '@reactory/server-core/types/reactory';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'

interface IReactoryTranslantionParams {
  locale: string
}

@resolver
class ReactoryTranslationResolver {

  resolver: any;

  @roles(["USER"], 'args.context')
  async ReactoryTranslation(obj: any,
    params: IReactoryTranslantionParams, 
    context: Reactory.IReactoryContext,
    ): Promise<Reactory.IReactoryTranslations> {
      const { locale } = params;
      const translateSvc: Reactory.Service.TReactoryTranslationService = context.getService("core.ReactoryTranslationService@1.0.0") as Reactory.Service.TReactoryTranslationService;
      return translateSvc.getTranslations(locale)
  }
}