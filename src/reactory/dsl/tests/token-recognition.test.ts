import tokenize from '../compiler/parser/lexer';

describe('Token Recognition for Chaining and Branching', () => {
  test('should recognize ARROW_CHAIN token', () => {
    const tokens = tokenize('-->');
    console.log('ARROW_CHAIN tokens:', tokens);
    expect(tokens.length).toBe(2); // ARROW_CHAIN + EOF
    expect(tokens[0].type).toBe('ARROW_CHAIN');
    expect(tokens[0].value).toBe('-->');
  });

  test('should recognize ARROW_BRANCH token', () => {
    const tokens = tokenize('-=>');
    expect(tokens.length).toBe(2); // ARROW_BRANCH + EOF
    expect(tokens[0].type).toBe('ARROW_BRANCH');
    expect(tokens[0].value).toBe('-=>');
  });

  test('should recognize chaining in context', () => {
    const tokens = tokenize('@print("Hello") --> @print("World")');
    const arrowChainToken = tokens.find(token => token.type === 'ARROW_CHAIN');
    expect(arrowChainToken).toBeDefined();
    expect(arrowChainToken?.value).toBe('-->');
  });

  test('should recognize branching in context', () => {
    const tokens = tokenize('@if(true) -=> [@print("Success"), @print("Failure")]');
    const arrowBranchToken = tokens.find(token => token.type === 'ARROW_BRANCH');
    expect(arrowBranchToken).toBeDefined();
    expect(arrowBranchToken?.value).toBe('-=>');
  });

  test('should not confuse with comparison operators', () => {
    const tokens = tokenize('a <= b >= c');
    const comparisonTokens = tokens.filter(token => token.type === 'COMPARISON_OPERATOR');
    const arrowTokens = tokens.filter(token => token.type === 'ARROW_CHAIN' || token.type === 'ARROW_BRANCH');
    
    expect(comparisonTokens.length).toBe(2); // <= and >=
    expect(arrowTokens.length).toBe(0); // No arrow tokens should be found
  });

  test('should handle mixed operators correctly', () => {
    const tokens = tokenize('@print("test") --> @if(a <= b) -=> [@print("success"), @print("failure")]');
    const arrowChainTokens = tokens.filter(token => token.type === 'ARROW_CHAIN');
    const arrowBranchTokens = tokens.filter(token => token.type === 'ARROW_BRANCH');
    const comparisonTokens = tokens.filter(token => token.type === 'COMPARISON_OPERATOR');
    
    expect(arrowChainTokens.length).toBe(1);
    expect(arrowBranchTokens.length).toBe(1);
    expect(comparisonTokens.length).toBe(1); // <=
  });
}); 