import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import { inject } from '@reactory/server-core/application/decorators/inject';
import logger from '@reactory/server-core/logging';

interface INaturalResolverParams {
  input: string
  compare?: string,
  lang?: string
  tokenizer?: string,
  options?: Partial<Reactory.Service.PackageOptions>
}

const tokenizers: string[] = [
  'WordTokenizer',
  'TreebankWordTokenizer',
  'AggressiveTokenizer',
  'CaseTokenizer',
  'WordPunctTokenizer',
  'RegexpTokenizer',
  'BlanklineTokenizer',
  'LineTokenizer',
  'SentTokenizer',
  'AggressiveSentTokenizer',
  'PunktTokenizer',
  'StanfordTokenizer',
  'Metaphone',
  'DoubleMetaphone',
  'SoundEx',
  'PorterStemmer',
  'LancasterStemmer',
  'Porter Stemmer (with step 2)',
  'Porter Stemmer (with Lancaster stemming)',
  'Porter Stemmer (with Lancaster stemming and step 2)',
  'Regexp Stemmer'
];


@resolver
class NaturalResolver {

  resolver: any;

  @roles(["USER"], 'args.context')
  @query("NaturalTokenize")
  // TODO: Fix this - injection not working as expected
  // @inject([
  //   "core.ReactoryNLPService@1.0.0",
  //   {
  //     id: "core.ReactoryNLPService@1.0.0",
  //     alias: "naturalService",
  //   }
  // ])
  NaturalTokenize(obj: any,
    params: INaturalResolverParams, 
    context: Reactory.Server.IReactoryContext,
    info: any,
    // TODO: Fix this 
    //{ naturalService }: { naturalService: Reactory.Service.INaturalService }    
    ): Reactory.Models.INaturalTokenizedInput {
      const { lang, tokenizer } = params;
      const { i18n, getService } = context;
      const naturalService = getService<Reactory.Service.INaturalService>("core.ReactoryNLPService@1.0.0");      
      return naturalService.tokenize(params.input, tokenizer)
    }

  @roles(["USER"], 'args.context')
  @query("NaturalTokenizers")
  async NaturalTokenizers(): Promise<string[]> {
    return tokenizers;
  }

  @roles(["USER"], 'args.context')
  @query("NaturalSentiment")
  async NaturalSentiment(obj: any,
    params: INaturalResolverParams,
    context: Reactory.Server.IReactoryContext,
    info: any,    
    ): Promise<Reactory.Models.INaturalSentiment> {
    const { lang } = params;
    const { i18n, getService } = context;
    const naturalService = getService<Reactory.Service.INaturalService>("core.ReactoryNLPService@1.0.0");
    logger.debug('NaturalTokenize', params, lang || i18n.language);
    return naturalService.sentiment(params.input, lang || i18n.language)
  }

  @roles(["USER"], 'args.context')
  @query("NaturalPackagedOuput")
  async NaturalPackagedOuput(obj: any,
    params: INaturalResolverParams,
    context: Reactory.Server.IReactoryContext,
    info: any,    
    ): Promise<Reactory.Service.INaturalPackageForInput> {
    const { lang, input, compare, options } = params;
    const { i18n, getService } = context;
    const naturalService = getService<Reactory.Service.INaturalService>("core.ReactoryNLPService@1.0.0");

    return naturalService.packageForInput(input, compare, lang || i18n.language, options)
  }

  
}

export default NaturalResolver;
