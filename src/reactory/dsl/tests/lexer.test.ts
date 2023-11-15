import tokenize from "../compiler/parser/lexer";
import { Token, TokenType } from "@reactory/server-core/types/compiler/lexer";
import { TokenisationMap } from "./mocks/tokens";
describe('Lexer', () => { 
  beforeEach(() => { 
    jest.clearAllMocks();
  });

  it('should tokenize a simple macro', () => {
    const input = '@print("Hello, World!")';
    const tokens = tokenize(input, { ignoreWhitespace: true });
    expect(tokens).toEqual(TokenisationMap[input]);
  });

  it('should tokenize a macro with a variable', () => {
    const input = '@print($name)';
    const tokens = tokenize(input, { ignoreWhitespace: true });
    expect(tokens).toEqual(TokenisationMap[input]);
  });

  it('should tokenize a macro with a variable and a string literal', () => {
    const input = '@print($name, "Hello, World!")';
    const tokens = tokenize(input, { ignoreWhitespace: true });
    expect(tokens).toEqual(TokenisationMap[input]);
  });

  it('should tokenize a macro with a variable and a number literal', () => {
    const input = '@print($name, 123)';
    const tokens = tokenize(input, { ignoreWhitespace: true });
    expect(tokens).toEqual(TokenisationMap[input]);
  });

  // a test that checks that the lexer can handle a macro with an if statement in it
  it('should tokenize a macro with an if statement', () => {
    const input = '@if ($name == "John") { @print("Hello, John!") }';
    const tokens = tokenize(input, { ignoreWhitespace: false, ignoreNewLines: false });
    expect(tokens).toEqual(TokenisationMap[input]);
  });

  // a test that checks the lexer can handle a macro with nested macros
  it('should tokenize an executable string', () => {
    const input = '@print(`Hello, @var($name)`)';
    const tokens = tokenize(input, { ignoreWhitespace: false, ignoreNewLines: false });    
    expect(tokens).toEqual(TokenisationMap[input]);
  });

  // a test that check if the lexer can parse a multi line macro
  it('should tokenize a multi line macro', () => {
    const input = `
    if ($name == "John") {
      @print("Hello, John!")
    }
    `;
    const tokens = tokenize(input, { ignoreWhitespace: false, ignoreNewLines: false });
    expect(tokens).toEqual(TokenisationMap[input]);
  });
});