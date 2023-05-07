import Reactory from "@reactory/reactory-core";
import { service } from "@reactory/server-core/application/decorators/service";
import Natural from 'natural';

@service({
  id: "core.ReactoryNLPService@1.0.0",
  name: "Natural Language Processing Service",
  description: "Natural Language Processing Service for reactory, uses the Natural library for nodejs",
  serviceType: 'data'
})
class ReactoryNLPService implements Reactory.Service.IReactoryNLPService {

  name: string = "ReactoryNLPService";
  nameSpace: string = "core";
  version: string = "1.0.0";

  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;
  
  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.props = props;
  }

  distance(textA: string, textB: string, method?: string, options?: any): Promise<number> {
    return Promise.resolve(0);
  }

  /**
   * do any initialization work for natural language processing service
   * before starting.
   * @returns 
   */
  onStartup(): Promise<any> {
    return Promise.resolve(true);
  }
  
  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  async tokenize(input: string, lang: string, tokenizer: string = 'WordTokenizer'): Promise<Reactory.Models.INaturalTokenizedInput> {
    const Tokenizer = Natural[tokenizer] as () => Natural.Tokenizer;
    const $tokenizer = new Tokenizer();
    return {
      input,
      lang,
      tokenizer: 'WordTokenizer',
      tokens: $tokenizer.tokenize(input),
    } 
  }

  async sentiment(input: string, lang: string): Promise<Reactory.Models.INaturalSentiment> {
    var Analyzer = Natural.SentimentAnalyzer;
    var stemmer = Natural.PorterStemmer;
    var analyzer = new Analyzer("English", stemmer, "afinn");
    const tokens = await this.tokenize(input, lang);
    const score = analyzer.getSentiment(tokens.tokens);
    let vote = 'neutral';
    if(score >= 0.7) { vote = 'very positive' }
    if(score >= 0.2) { vote = 'positive' }
    if(score < -0.1) { vote = 'negative' }
    if(score < -0.5) { vote = 'very negative' }
    return {
      input,
      lang,
      score,
      comparative: 0,
      vote
    }
  }
}

export default ReactoryNLPService;