import tokenize from '../compiler/parser/lexer';

describe('String Interpolation Test', () => {
  test('should recognize EXECUTABLE_STRING_LITERAL token', () => {
    const tokens = tokenize('`Hello World`');
    const executableStringToken = tokens.find(token => token.type === 'EXECUTABLE_STRING_LITERAL');
    expect(executableStringToken).toBeDefined();
    expect(executableStringToken?.value).toBe('`Hello World`');
  });

  test('should recognize string interpolation with variables', () => {
    const tokens = tokenize('`Hello ${name}`');
    const executableStringToken = tokens.find(token => token.type === 'EXECUTABLE_STRING_LITERAL');
    expect(executableStringToken).toBeDefined();
    expect(executableStringToken?.value).toBe('`Hello ${name}`');
  });

  test('should handle empty string interpolation', () => {
    const tokens = tokenize('``');
    const executableStringToken = tokens.find(token => token.type === 'EXECUTABLE_STRING_LITERAL');
    expect(executableStringToken).toBeDefined();
    expect(executableStringToken?.value).toBe('``');
  });

  test('should handle string interpolation with only variables', () => {
    const tokens = tokenize('`${name}`');
    const executableStringToken = tokens.find(token => token.type === 'EXECUTABLE_STRING_LITERAL');
    expect(executableStringToken).toBeDefined();
    expect(executableStringToken?.value).toBe('`${name}`');
  });
}); 