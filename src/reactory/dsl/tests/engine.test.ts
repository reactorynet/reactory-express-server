import { createContext, execute  } from '../compiler/engine';


describe('Macro Execution Engine', () => { 

  it('should execute a simple macro', async () => {    
    await execute('@print("Hello, World!")', createContext(null, 'mock'));
  });

  it('should execute a macro with a variable', async () => { 
    await execute(`
    $name="Werner";
    @print($name);
    `, createContext(null, 'mock'));
  });
});