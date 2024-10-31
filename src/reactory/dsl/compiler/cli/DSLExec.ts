import readline, { ReadLine } from 'readline';
import logger from "@reactory/server-core/logging";
import { execute, createContext } from '../engine';
/**
 * Executes a DSL script within the context of an authenticated reactory instance.
 * @param kwargs 
 * @param context 
 */
const DSLExec = async (kwargs: string[], context: Reactory.Server.IReactoryContext): Promise<void> => { 
  
    const { 
      stdin,
      stdout
    } = process;
  
    const rl: ReadLine = context.readline as ReadLine;
  
    let pastedContent: string = '';
  
    // Function to sanitize the pasted content
    function sanitizeContent(content: string) {
      logger.info(`Sanitizing content\n: ${content}`);
      return content.trim();
    }

    const exec = async (input: string): Promise<void> => { 
      await execute(input, await createContext(context, 'cli'));
    };
  
    process.stdin.on('paste', async () => {
      pastedContent = stdin.read().toString();
      logger.info(`Pasted content:\n${pastedContent}`);
      await exec(sanitizeContent(pastedContent));
    });
  
    rl.prompt();
  
    rl.on('line', async (input) => {
      logger.info(`Received input:\n${input}`);
      await exec(sanitizeContent(input));
    });
  
    rl.on('close', () => {
      logger.info('Have a great day!');
      process.exit(0);
    });
};