import readline from 'readline';
import Reactory from '@reactory/reactory-core';
import ReactoryContextProvider from 'context/ReactoryContextProvider';
import colors from './colors';
import i18next from 'i18next';

const STARTUP_TEXT = require.resolve('./startup.txt');

const DEFAULT_COMPLETIONS = ['help', 'exit', 'quit', 'exec'];

const getCompletions = (line: string, context: Reactory.Server.IReactoryContext): string[] => { 
  const collected: string[] = [];
  context.modules.forEach((module: Reactory.Server.IReactoryModule) => {
    module.cli?.forEach((cli: Reactory.IReactoryComponentDefinition<(varg: string[]) => Promise<void>>) => {
      collected.push(cli.name.toLowerCase());
    });
  });

  return [...DEFAULT_COMPLETIONS, ...collected];
}
const getReadline = ({ 
  prompt = 'reactory-cli> ',
  completer = null,
  historySize = 100,
  removeHistoryDuplicates = true,
  crlfDelay = 100,
  escapeCodeTimeout = 500,
}: Partial<readline.ReadLineOptions>) => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt,
    terminal: true,
    completer,
    crlfDelay,
    escapeCodeTimeout,
    historySize,
    removeHistoryDuplicates,
  });
}


/**
 * A CLI for Reactory, it collects all the available commands 
 * from the modules and provides a uniform method for the CLI to
 * execute the commands.
 * 
 * Usage: reactory <command> [options]
 * 
 * Most commands should support the following options:
 * -h, --help: Show help for the command.
 * -v, --verbose: Show verbose output for the command.
 * -q, --quiet: Show no output for the command.
 * -version, --version: Show the version of the command.
 * 
 * For options on the reactory-cli itself, use the following:
 * -h, --help: Show help for reactory cli.
 * --list <module>: List all the commands available for a module.
 * --modules: List all the modules available.
 * e.g. To start the reactory AI bot and use the command line use
 * ```bash
 * > reactory reactor
 * ```
 * @param vargs - The command line arguments passed to the CLI.
 */
const main = async (vargs: string[]): Promise<void> => {
  try {
    let user: Reactory.Models.IUserDocument = null;
    i18next.init({ 
      
    })
    const currentContext: Partial<Reactory.Server.IReactoryContext> = {
      user,
      partner: null,
      i18n: i18next,
    }
    const context = await ReactoryContextProvider(null, currentContext);
    const { i18n } = context;
    const { t } = i18n;
    const rl = getReadline({
      prompt: 'reactory-cli> ',
      completer: (line: string) => {
        return getCompletions(line, context);
      },
    });

    rl.on('close', () => {
      console.log(t('reactorycli:common.goodbye', 'Goodbye.'))
      process.exit(0);
    });

    rl.prompt(false);

    rl.write(colors.green(STARTUP_TEXT));

    rl.close();

  } catch (error) {
    console.error('Error occurred in main:', error);
    process.exit(1);
  }
}

// Execute the main function.
main(process.argv.slice(2));