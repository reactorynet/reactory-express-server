import Reactory from "@reactory/reactory-core";
import { service } from "@reactory/server-core/application/decorators/service";
import Natural from 'natural';

class FrequencyDistribution implements Reactory.Service.FrequencyDistribution {
  private frequencyMap: { [token: string]: number } = {};
  private totalCount: number = 0;
  private packageOptions: Reactory.Service.PackageOptions = {};
  constructor(tokens?: string[]) {
    if (tokens) {
      this.add(tokens);
    }
  }

  keys(): string[] {
    return Object.keys(this.frequencyMap);
  }

  count(token: string): number {
    return this.frequencyMap[token] || 0;
  }

  N(): number {
    return this.totalCount;
  }

  frequency(token: string): number {
    return this.count(token) / this.totalCount;
  }

  mostCommon(n: number = 10): [string, number][] {
    return this.sorted().slice(0, n);
  }

  get(): { [token: string]: number } {
    return this.frequencyMap;
  }

  increment(token: string, count: number = 1): void {
    if (!this.frequencyMap[token]) {
      this.frequencyMap[token] = count;
    } else {
      this.frequencyMap[token] += count;
    }
    this.totalCount += count;
  }

  add(tokens: string[], update: boolean = true): void {
    tokens.forEach(token => {
      if (update) {
        this.increment(token);
      } else if (!this.frequencyMap[token]) {
        this.frequencyMap[token] = 1;
        this.totalCount++;
      }
    });
  }

  private sorted(): [string, number][] {
    return Object.entries(this.frequencyMap).sort((a, b) => b[1] - a[1]);
  }
}


@service({
  id: "core.ReactoryNLPService@1.0.0",
  name: "Natural Language Processing Service",
  description: "Natural Language Processing Service for reactory, uses the Natural library for nodejs",
  serviceType: "data",
})
class ReactoryNLPService implements Reactory.Service.INaturalService {

  name: string = "ReactoryNLPService";
  nameSpace: string = "core";
  version: string = "1.0.0";

  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;
  packageOptions: Reactory.Service.PackageOptions = {};

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.props = props;
    if(props.packageOptions) {
      this.packageOptions = props.packageOptions;
    }
  }

  /**
   * Sets the package options for the service
   * @param packageOptions 
   */
  setPackageOptions(packageOptions: Reactory.Service.PackageOptions) {
    this.packageOptions = packageOptions;
  }

  stem(word: string, lang?: string): string {
    throw new Error("Method not implemented.");
  }
  ngrams(text: string, n: number): string[] {
    throw new Error("Method not implemented.");
  }

  tag(text: string, lang?: string): string[] {
    throw new Error("Method not implemented.");
  }
  spellcheck(text: string, lang?: string, customDictionary?: string[]): Reactory.Models.INaturalSpellCheckResult {
    const spellChecker = new Natural.Spellcheck(customDictionary);
    
    const tokens = this.tokenize(text, lang).tokens;
    const corrections: Reactory.Models.INaturalSpellCheckCorrection[] = [];
    tokens.forEach(token => { 
        const correct = spellChecker.isCorrect(token);
        if(!correct) {
          corrections.push({ 
            word: token,
            suggestions: spellChecker.getCorrections(token)
          });
        }
    });
    
    return {
      lang,
      input: text,
      corrections: corrections,
      correct: corrections.length === 0
    }
  }
  getSynonyms(word: string, pos?: string, lang?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getAntonyms(word: string, pos?: string, lang?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getHypernyms(word: string, pos?: string, lang?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getHyponyms(word: string, pos?: string, lang?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getMeronyms(word: string, pos?: string, lang?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  getHolonyms(word: string, pos?: string, lang?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  truncate(text: string, length?: number, ellipsis?: string): string {
    return text.substring(0, length) + (ellipsis || '...');
  }
  normalize(text: string): string {
    return Natural.PorterStemmer.stem(text);
  }
  equals(s1: string, s2: string): boolean {
    return s1 === s2;
  }
  randomString(length?: number, charset?: string): string {
    throw new Error("Method not implemented.");
  }
  hash(text: string, algorithm?: string, encoding?: string): string {
    throw new Error("Method not implemented.");
  }

  frequencyDistribution(tokens: string[]): Reactory.Service.FrequencyDistribution {
    throw new Error("Method not implemented.");
  }

  /**
   * Calculates the Levenshtein distance between two strings.
   * @param s1 - the first string
   * @param s2 - the second string
   * @returns the Levenshtein distance between s1 and s2
   */
  levenshteinDistance(s1: string, s2: string): number {
    return Natural.LevenshteinDistance(s1, s2);
  }

  /**
   * Calculates the Jaro-Winkler distance between two strings.
   * @param s1 - the first string
   * @param s2 - the second string
   * @returns the Jaro-Winkler distance between s1 and s2
   */
  jaroWinklerDistance(s1: string, s2: string, ignoreCase: boolean = true): number {
    return Natural.JaroWinklerDistance(s1, s2, { ignoreCase });
  }

  /**
   * Calculates the Dice coefficient between two strings.
   * @param s1 - the first string
   * @param s2 - the second string
   * @returns the Dice coefficient between s1 and s2
   */
  diceCoefficient(s1: string, s2: string): number {
    return Natural.DiceCoefficient(s1, s2);
  }

  /**
   * Calculates the Jaccard index between two sets of tokens.
   * 
   * The Jaccard Index is calculated by dividing the size of 
   * the intersection of the two sets by the size of the union 
   * of the two sets. 
   * 
   * In this implementation, we use the Set data structure to 
   * compute the sizes of the sets and their intersection. 
   * The function returns a number between 0 and 1, where 0 
   * indicates no overlap between the sets, and 1 indicates 
   * that the sets are identical.
   * 
   * @param set1 - the first set of tokens
   * @param set2 - the second set of tokens
   * @returns the Jaccard index between set1 and set2
   */
  jaccardIndex(set1: string[], set2: string[]): number {
    const set1Size = new Set(set1).size;
    const set2Size = new Set(set2).size;

    if (set1Size === 0 && set2Size === 0) {
      return 1;
    }

    const intersectionSize = new Set(set1.filter((token) => set2.includes(token))).size;

    return intersectionSize / (set1Size + set2Size - intersectionSize);
  }

  /**
   * Calculates the Overlap coefficient between two sets of tokens.
   * 
   * This function takes two string arrays as inputs, 
   * representing sets, and returns a number between 0 and 1 
   * representing the similarity between the sets. 
   * It calculates the overlap coefficient by finding the 
   * size of the intersection of the sets and dividing by 
   * the size of the smaller set.
   * 
   * @param set1 - the first set of tokens
   * @param set2 - the second set of tokens
   * @returns the Overlap coefficient between set1 and set2
   */
  overlapCoefficient(set1: string[], set2: string[]): number {
    const intersectionSize = set1.filter(value => set2.includes(value)).length;
    const minSize = Math.min(set1.length, set2.length);
    return intersectionSize / minSize;
  }


  distance(textA: string, textB: string, method?: string, options?: any): Promise<number> {
    return Promise.resolve(0);
  }

  tokenize(input: string, lang: string, tokenizer: string = 'WordTokenizer'): Reactory.Models.INaturalTokenizedInput {
    const Tokenizer = Natural[tokenizer] as () => Natural.Tokenizer;
    const $tokenizer = new Tokenizer();
    return {
      input,
      lang,
      tokenizer: 'WordTokenizer',
      tokens: $tokenizer.tokenize(input),
    }
  }

  sentiment(input: string, lang: string): Reactory.Models.INaturalSentiment {
    var Analyzer = Natural.SentimentAnalyzer;
    var stemmer = Natural.PorterStemmer;
    var analyzer = new Analyzer("English", stemmer, "afinn");
    const tokens = this.tokenize(input, lang);
    const score = analyzer.getSentiment(tokens.tokens);
    let vote: Reactory.Models.NaturalSentimentVote = "neutral"
    if (score >= 0.2) { vote = "positive" }
    if (score >= 0.7) { vote = "very_positive" }
    if (score <= -0.1) { vote = "negative" }
    if (score <= -0.5) { vote = "very_negative" }
    return {
      input,
      lang,
      score,
      vote
    }
  }

  /**
   * Creates a natural language package for the given input.
   * !warning: use with caution as this is an expensive operation
   * @param input 
   * @param lang 
   * @param options 
   */
  packageForInput(input: string, compare?: string, lang?: string, options?: Reactory.Service.PackageOptions): Reactory.Service.INaturalPackageForInput {
    const $package: Reactory.Service.INaturalPackageForInput = {
      antonyms: [],
      diceCoefficient: 0,
      equals: false,
      hash: '',
      hypernyms: [],
      hyponyms: [],
      jaccardIndex: 0,
      jaroWinklerDistance: 0,
      levenshteinDistance: 0,
      meronyms: [],
      mostCommon: [],
      frequencyDistribution: {},
      ngrams: [],
      normalize: '',
      overlapCoefficient: 0,
      randomString: '',
      sentiment: {
        input,
        lang,
        score: 0,
        vote: "neutral"
      },
      spellcheck: {
        input,
        lang,
        correct: false,
        corrections: [],
      },
      stem: '',
      synonyms: [],
      tag: [],
    }

    $package.sentiment = this.sentiment(input, lang);
    if(compare) {
      const inputTokens = this.tokenize(input, lang).tokens;
      const compareTokens = this.tokenize(compare, lang).tokens;
      $package.overlapCoefficient = this.overlapCoefficient(inputTokens,compareTokens);
      $package.jaccardIndex = this.jaccardIndex(inputTokens, compareTokens); 
      $package.diceCoefficient = this.diceCoefficient(input, compare);
      $package.levenshteinDistance = this.levenshteinDistance(input, compare);
      $package.jaroWinklerDistance = this.jaroWinklerDistance(input, compare);
      $package.equals = this.equals(input, compare);      
    }

    $package.spellcheck = this.spellcheck(input, lang);
    
    return $package;
  };

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

  
}

export default ReactoryNLPService;