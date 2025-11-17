import tokenize from '../compiler/parser/lexer';

describe('Control Flow Structures Test', () => {
  describe('Token Recognition for Control Flow', () => {
    test('should recognize IF token', () => {
      const tokens = tokenize('if(true) { @print("hello") }');
      const ifToken = tokens.find(token => token.type === 'IF');
      expect(ifToken).toBeDefined();
      expect(ifToken?.value).toBe('if');
    });

    test('should recognize WHILE token', () => {
      const tokens = tokenize('while(true) { @print("loop") }');
      const whileToken = tokens.find(token => token.type === 'WHILE');
      expect(whileToken).toBeDefined();
      expect(whileToken?.value).toBe('while');
    });

    test('should recognize FOR token', () => {
      const tokens = tokenize('for(i=0; i<10; i++) { @print("loop") }');
      const forToken = tokens.find(token => token.type === 'FOR');
      expect(forToken).toBeDefined();
      expect(forToken?.value).toBe('for');
    });

    test('should recognize SWITCH token', () => {
      const tokens = tokenize('switch(value) { case 1: @print("one") }');
      const switchToken = tokens.find(token => token.type === 'SWITCH');
      expect(switchToken).toBeDefined();
      expect(switchToken?.value).toBe('switch');
    });

    test('should recognize TRY token', () => {
      const tokens = tokenize('try { @print("try") } catch { @print("catch") }');
      const tryToken = tokens.find(token => token.type === 'TRY');
      expect(tryToken).toBeDefined();
      expect(tryToken?.value).toBe('try');
    });

    test('should recognize CATCH token', () => {
      const tokens = tokenize('try { @print("try") } catch { @print("catch") }');
      const catchToken = tokens.find(token => token.type === 'CATCH');
      expect(catchToken).toBeDefined();
      expect(catchToken?.value).toBe('catch');
    });

    test('should recognize ELSE token', () => {
      const tokens = tokenize('if(true) { @print("yes") } else { @print("no") }');
      const elseToken = tokens.find(token => token.type === 'ELSE');
      expect(elseToken).toBeDefined();
      expect(elseToken?.value).toBe('else');
    });

    test('should recognize ELIF token', () => {
      const tokens = tokenize('if(true) { @print("yes") } elif(false) { @print("maybe") } else { @print("no") }');
      const elifToken = tokens.find(token => token.type === 'ELIF');
      expect(elifToken).toBeDefined();
      expect(elifToken?.value).toBe('elif');
    });
  });

  describe('Control Flow Parsing', () => {
    test('should parse basic if statement', () => {
      const input = 'if(true) { @print("hello") }';
      const tokens = tokenize(input);
      expect(tokens.length).toBeGreaterThan(1);
      
      const ifToken = tokens.find(token => token.type === 'IF');
      expect(ifToken).toBeDefined();
    });

    test('should parse if-else statement', () => {
      const input = 'if(true) { @print("yes") } else { @print("no") }';
      const tokens = tokenize(input);
      
      const ifToken = tokens.find(token => token.type === 'IF');
      const elseToken = tokens.find(token => token.type === 'ELSE');
      expect(ifToken).toBeDefined();
      expect(elseToken).toBeDefined();
    });

    test('should parse if-elif-else statement', () => {
      const input = 'if(true) { @print("yes") } elif(false) { @print("maybe") } else { @print("no") }';
      const tokens = tokenize(input);
      
      const ifToken = tokens.find(token => token.type === 'IF');
      const elifToken = tokens.find(token => token.type === 'ELIF');
      const elseToken = tokens.find(token => token.type === 'ELSE');
      expect(ifToken).toBeDefined();
      expect(elifToken).toBeDefined();
      expect(elseToken).toBeDefined();
    });

    test('should parse while loop', () => {
      const input = 'while(true) { @print("loop") }';
      const tokens = tokenize(input);
      
      const whileToken = tokens.find(token => token.type === 'WHILE');
      expect(whileToken).toBeDefined();
    });

    test('should parse for loop', () => {
      const input = 'for(i=0; i<10; i++) { @print("loop") }';
      const tokens = tokenize(input);
      
      const forToken = tokens.find(token => token.type === 'FOR');
      expect(forToken).toBeDefined();
    });

    test('should parse switch statement', () => {
      const input = 'switch(value) { case 1: @print("one") }';
      const tokens = tokenize(input);
      
      const switchToken = tokens.find(token => token.type === 'SWITCH');
      const caseToken = tokens.find(token => token.type === 'CASE');
      expect(switchToken).toBeDefined();
      expect(caseToken).toBeDefined();
    });

    test('should parse try-catch statement', () => {
      const input = 'try { @print("try") } catch { @print("catch") }';
      const tokens = tokenize(input);
      
      const tryToken = tokens.find(token => token.type === 'TRY');
      const catchToken = tokens.find(token => token.type === 'CATCH');
      expect(tryToken).toBeDefined();
      expect(catchToken).toBeDefined();
    });
  });

  describe('Control Flow Edge Cases', () => {
    test('should handle empty if statement', () => {
      const input = 'if(true) { }';
      const tokens = tokenize(input);
      
      const ifToken = tokens.find(token => token.type === 'IF');
      expect(ifToken).toBeDefined();
    });

    test('should handle nested control structures', () => {
      const input = 'if(true) { while(false) { @print("nested") } }';
      const tokens = tokenize(input);
      
      const ifToken = tokens.find(token => token.type === 'IF');
      const whileToken = tokens.find(token => token.type === 'WHILE');
      expect(ifToken).toBeDefined();
      expect(whileToken).toBeDefined();
    });

    test('should handle complex conditions', () => {
      const input = 'if($name === "John" && $age > 18) { @print("adult") }';
      const tokens = tokenize(input);
      
      const ifToken = tokens.find(token => token.type === 'IF');
      const comparisonToken = tokens.find(token => token.type === 'COMPARISON_OPERATOR');
      expect(ifToken).toBeDefined();
      expect(comparisonToken).toBeDefined();
    });

    test('should handle multiple cases in switch', () => {
      const input = 'switch(value) { case 1: @print("one") case 2: @print("two") default: @print("other") }';
      const tokens = tokenize(input);
      
      const switchToken = tokens.find(token => token.type === 'SWITCH');
      const caseTokens = tokens.filter(token => token.type === 'CASE');
      expect(switchToken).toBeDefined();
      expect(caseTokens.length).toBeGreaterThan(0);
    });
  });

  describe('Control Flow Performance', () => {
    test('should handle large control structures efficiently', () => {
      const largeIf = 'if(true) { ' + '@print("hello") '.repeat(100) + '}';
      const startTime = Date.now();
      const tokens = tokenize(largeIf);
      const endTime = Date.now();
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    test('should handle multiple control structures', () => {
      const inputs = [
        'if(true) { @print("yes") }',
        'while(false) { @print("loop") }',
        'for(i=0; i<5; i++) { @print("for") }',
        'switch(value) { case 1: @print("one") }',
        'try { @print("try") } catch { @print("catch") }'
      ];
      
      for (const input of inputs) {
        const tokens = tokenize(input);
        expect(tokens.length).toBeGreaterThan(0);
      }
    });
  });
}); 