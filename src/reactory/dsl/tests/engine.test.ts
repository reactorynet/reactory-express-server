import { get } from 'lodash';
import { createContext, execute  } from '../compiler/engine';
import getAnonUserContext from './mocks/context/AnonUserContext';
import ExecutionContext from '../compiler/engine/ExecutionContext';


describe('Macro Execution Engine', () => { 

  it('should execute a simple macro', async () => {        
    await execute('@print("Hello, World!")', await createContext(await getAnonUserContext(), 'mock'));
  });

  it('should execute a macro with a variable', async () => {     
    await execute(`
    $name="Werner";
    @print($name);
    `, await createContext(await getAnonUserContext(), 'mock'));
  });
});