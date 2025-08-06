import { createCST } from '../compiler/parser/cst';
import tokenize from '../compiler/parser/lexer';

describe('Debug Token Consumption', () => {
  it('should debug IF statement parsing', () => {
    const source = 'if($name == "John") { @print("Hello, John!") }';
    const tokens = tokenize(source, { 
      ignoreWhitespace: false,
      ignoreComments: false,
      ignoreNewLines: false,
      inputId: 'debug-test'
    });
    
    console.log('Tokens:', tokens.map(t => `${t.type}: "${t.value}"`));
    
    try {
      const cst = createCST(tokens);
      console.log('CST created successfully');
    } catch (error) {
      console.error('Error creating CST:', error.message);
      throw error;
    }
  });
}); 