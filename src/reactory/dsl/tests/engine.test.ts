import { createContext, execute, executeAST  } from '../compiler/engine';
import Scripts from '../tests/mocks/scripts'
import { NameProgramASTProgramNode } from '../tests/mocks/ast';
import getAnonUserContext from './mocks/context/AnonUserContext';



describe('Macro Execution Engine', () => { 

  // it('should execute a simple macro', async () => {        
  //   await execute('@print("Hello, World!")', await createContext(await getAnonUserContext(), 'mock'));
  // });

  // it('should execute a macro with a variable', async () => {     
  //   await execute(`
  //   $name="Werner";
  //   @print($name);
  //   `, await createContext(await getAnonUserContext(), 'mock'));
  // });

  it('should execute an AST with a variable declaration', async () => { 
    const context = await createContext(await getAnonUserContext(), 'mock');
    await executeAST(NameProgramASTProgramNode._01_VariableDeclaration, context);
    expect(context.get('name')).toEqual('John');
  });
});