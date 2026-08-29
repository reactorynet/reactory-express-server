import fs from 'fs';
import { template } from 'lodash';
import readline from 'readline';
import yaml from "js-yaml";
import Reactory from '@reactorynet/reactory-core';
import ReactoryContextProvider from '@reactory/server-core/context/ReactoryContextProvider';
import colors from './colors';
import i18next from '@reactory/server-core/express/i18n';
import MongooseConnection from '@reactory/server-core/models/mongoose';
import { ReactoryClient } from '@reactory/server-modules/reactory-core/models';
import ReactoryModules from '@reactory/server-core/modules'
import { 
  TCLI,
  CliConfig,
  Job,
  CliJob,
  WorkflowJob,
  ServiceJob,
  FormJob,
  CliContext
} from './types';



const getStartupText = () => fs.readFileSync(require.resolve('./startup.txt')).toString();

const DEFAULT_COMPLETIONS = ['help', 'exit', 'quit', 'exec'];
const ALL_COMMANDS: Reactory.IReactoryComponentDefinition<TCLI>[] = [];

ReactoryModules.enabled.forEach((module) => {
  module.cli?.forEach((cli) => {
    ALL_COMMANDS.push(cli);
  });    
});

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

const getCLI = (name: string): Reactory.IReactoryComponentDefinition<TCLI> => { 
  let found: Reactory.IReactoryComponentDefinition<TCLI> = null;

  if (name.indexOf('@') > 0 || name.indexOf('.') > 0) { 
    const searchLower = name.toLowerCase();
    const matches = ALL_COMMANDS.filter((cli) => {
      const fqn = `${cli.nameSpace}.${cli.name}@${cli.version}`.toLowerCase();
      const nameSpaceAndName = `${cli.nameSpace}.${cli.name}`.toLowerCase();
      return fqn === searchLower || nameSpaceAndName === searchLower;
    });

    if (matches.length > 1) {
      throw new Error(`Multiple matches found for ${name}. Please specify the full name of the cli.`);
    }

    if (matches.length === 1) {
      found = matches[0];
    }
  } else {
    // find the cli by name, stem, or feature action
    ALL_COMMANDS.forEach((cli) => {
      if (
        cli.name.toLowerCase() === name.toLowerCase() ||
        cli.stem?.toLowerCase() === name.toLowerCase() ||
        cli.features?.some(f => f.action?.includes(name.toLowerCase()) || f.stem?.toLowerCase() === name.toLowerCase())
      ) {
        found = cli;
      }
    });
  }

  return found;
}

/**
 * Informational switches that short-circuit command dispatch.
 *
 * Accepts BOTH the flag form and the bare form, because `bin/reactory --help` advertises
 * `list [module]` and `modules` as bare commands while this module has always looked for
 * `--list` / `--modules`. Supporting both means the documented usage works either way.
 *
 *   -h  | --help    | help          show the CLI help text
 *   -l  | --list    | list [module] list registered CLI commands, optionally filtered
 *         --modules | modules       list enabled modules
 *         --version                 print the server version
 *
 * NOTE: `-v` is deliberately NOT bound to --version. Both launchers (bin/reactory and
 * the bin/cli.sh shim) consume `-v` as their own verbose flag, so it never reaches here;
 * binding it would advertise something that cannot work.
 *
 * Returns true when a switch was handled, in which case the caller should exit without
 * dispatching a command.
 */
const INFO_SWITCHES = new Set([
  '-h', '--help', 'help',
  '-l', '--list', 'list',
  '--modules', 'modules',
  '--version',
]);

const processCliArgs = (cargs: string[]): boolean => {
  for (let i = 0; i < cargs.length; i++) {
    const raw = cargs[i];
    // Split on the FIRST '=' only; everything after it is the value. (The previous
    // implementation also split on ' ' and ':', which corrupted any value containing
    // either — argv entries are already separate tokens, so neither split was correct.)
    const eq = raw.indexOf('=');
    const flag = eq === -1 ? raw : raw.slice(0, eq);

    if (!INFO_SWITCHES.has(flag)) continue;

    // Value from `--list=core`, else the following token when it is not itself a flag.
    let value: string | undefined = eq === -1 ? undefined : raw.slice(eq + 1);
    if (value === undefined && i + 1 < cargs.length && !cargs[i + 1].startsWith('-')) {
      value = cargs[i + 1];
    }

    switch (flag) {
      case '-h':
      case '--help':
      case 'help': {
        console.log(colors.green(fs.readFileSync(require.resolve('./help.txt')).toString()));
        return true;
      }

      case '-l':
      case '--list':
      case 'list': {
        // Print the INVOCATION NAME first. The old listing printed only
        // "core.Workflow@1.0.0", which is not what you type — the CLI resolves by stem
        // or feature action, so `workflow` is the usable name and the fqn is detail.
        const rows: string[] = [];
        ReactoryModules.enabled.forEach((module) => {
          const moduleFqn = `${module.nameSpace}.${module.name}@${module.version}`;
          const matches = !value
            || module.name.toLowerCase() === value.toLowerCase()
            || moduleFqn === value;
          if (!matches || !(module.cli?.length > 0)) return;

          module.cli.forEach((cli) => {
            const invocation = cli.stem
              || cli.features?.find((f: Reactory.IReactoryComponentFeature) => f.stem)?.stem
              || cli.name;
            rows.push(`  ${String(invocation).padEnd(20)} ${cli.nameSpace}.${cli.name}@${cli.version}`);
          });
        });

        if (rows.length === 0) {
          console.log(colors.yellow(
            value ? `No CLI commands found for module "${value}".` : 'No CLI commands registered.'));
        } else {
          console.log(colors.green(
            `Available commands${value ? ` for module ${value}` : ''}:\n${rows.join('\n')}`));
        }
        return true;
      }

      case '--modules':
      case 'modules': {
        const rows: string[] = [];
        ReactoryModules.enabled.forEach((module) => {
          const cliCount = module.cli?.length || 0;
          rows.push(`  ${`${module.nameSpace}.${module.name}@${module.version}`.padEnd(48)}` +
                    `${cliCount} cli command${cliCount === 1 ? '' : 's'}`);
        });
        console.log(colors.green(`Enabled modules:\n${rows.join('\n')}`));
        return true;
      }

      case '--version': {
        let version = 'unknown';
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          version = require('../../../package.json').version || version;
        } catch { /* fall through to "unknown" */ }
        console.log(colors.green(`reactory-server ${version}`));
        return true;
      }
    }
  }

  return false;
};

const loadYamlConfig = (file: string): CliConfig => { 
  let yamlText = fs.readFileSync(file).toString();
  yamlText = template(yamlText)({ 
    env: { ...process.env }
  });

  const config = yaml.load(yamlText, { schema: yaml.JSON_SCHEMA } as yaml.LoadOptions) as CliConfig;
  if(!config) {
    console.error(colors.red('Invalid yaml file.'));
    process.exit(1);
  }

  return config;
}


/**
 * Runs multiple job for a given configuration
 * @param config 
 */
const MultiStageJobRunner = async (config: CliConfig, context: CliContext) => {
  const { i18n } = context;
  const { t } = i18n;
  for (const job of config.jobs) {
    if ((job as CliJob)?.command) {
      // cli job
      const {
        command,
        args
      } = job as CliJob;
      const cli: Reactory.IReactoryComponentDefinition<TCLI> = getCLI(command);
      if(cli?.component) {
        try {
          await cli.component(args, context);
        } catch(error) { 
          console.error(colors.red(t('cli:common.commandError', 'Error executing command.')));
          console.error(error);
        }
      } else {
        console.error(colors.red(t('cli:common.invalidCommand', 'Invalid command.')));
        process.exit(1);
      }
    }

    if ((job as ServiceJob)?.service) {
      // service job
      const { 
        service,
        method,
        params = {},
        state = {},
        async = true,
      } = job as ServiceJob;

      const svc = context.getService(service, {});
      // @ts-ignore
      if(typeof svc[method] === 'function') {
        if (async === false) 
          //@ts-ignore
          svc[method](params)
        else
          //@ts-ignore
          await svc[method](params)
      }
    }

    if ((job as WorkflowJob)?.workflow) {
      // workflow job
    }

    if ((job as FormJob)?.form) {
      // form job
    }
  }
}

/**
 * A CLI for Reactory, it collects all the available commands 
 * from the modules and provides a uniform method for the CLI to
 * execute the commands.
 * 
 * Usage: reactory <command|file.yaml> [options]
 * 
 * Most commands should support the following options:
 * -h, --help: Show help for the command.
 * -v, --verbose: Show verbose output for the command.
 * -q, --quiet: Show no output for the command.
 * -ver, --version: Show the version of the command.
 * 
 * For options on the reactory-cli itself, use the following:
 * --cname: The environment name to use for the command. (this value is used by the cli.sh and cli.cmd file)
 * --cenv: The environment to use for the command. (this value is used by the cli.sh file)
 * -p, --partner: The partner to use for the command.
 * -u, --user: The user to use for the command.
 * -pwd, --password: The password to use for the command.
 * -h, --help: Show help for reactory cli.
 * --list <module>: List all the commands available for a module.
 * --modules: List all the modules available.
 * e.g. To start the reactory AI bot and use the command line use
 * ```bash
 * > reactory reactor -p=reactory --cenv=local --cname=reactory
 * ```
 * @param vargs - The variable length command line arguments passed to the CLI as a string array
 * vargs[0] = The is the cli.sh or cli.cmd file.
 * vargs[1] = The command to execute or command switch for the CLI or a yaml file.
 * vargs[2..n] = The options for the command.
 */
const ReactoryCli = async (vargs: string[]): Promise<void> => {
  try {
    if(vargs.length === 0) {
      console.error(colors.red('No arguments provided.'));
      process.exit(1);
    };

    await MongooseConnection();

    let userName: string = null;
    let password: string = null;
    let partnerKey: string = null;
    let config: CliConfig = null;
    let user: Reactory.Models.IUserDocument = null;
    let partner: Reactory.Models.IReactoryClientDocument = null;
    const currentContext: Partial<CliContext> = {
      user,
      partner,
      i18n: i18next,
      readLine: null
    }
    const context: CliContext = await ReactoryContextProvider<CliContext>(null, currentContext);
    const { i18n } = context;
    const { t } = i18n;

    

    // Find actual command arguments (strip babel args before '--' if present)
    const dashDashIndex = vargs.indexOf('--');
    let cargs: string[] = dashDashIndex >= 0 ? vargs.slice(dashDashIndex + 1) : vargs;

    // Informational switches (--help / --list / --modules / --version) short-circuit
    // here, BEFORE command resolution — they describe the CLI rather than invoking a
    // command, so they must not fall through to "No command found". processCliArgs was
    // previously declared but never called, which is why `--modules` and `--list` had
    // never worked from either launcher.
    if (processCliArgs(cargs)) {
      process.exit(0);
    }
    // check for config first
    if(cargs[0] && cargs[0].indexOf('.yaml') !== -1 && fs.existsSync(cargs[0]) === true){ 
      //we will process the yaml file.
      config = loadYamlConfig(cargs[0]);

      if(config.user) userName = config.user;
      if(config.password) password = config.password;
      
      if(!config.jobs) {
        console.log(colors.yellow(t('cli.common.noJobs', `No jobs detected in ${cargs[0]}, exiting`)))
        process.exit(1);
      }

      if(config.jobs.length === 1 ){ 
        console.log(colors.green(t('cli.common.singleJob', 'Single job detected')));
      } else {
        console.log(colors.green(t('cli:common.multipleJobs', `Multi stage jobs detected. Processing ${config.jobs.length} jobs.`)));          
      }
    } else {
      if (cargs.length === 0) {
        console.error(colors.red(t('cli:common.noArguments', 'No arguments provided and no config present')));
        process.exit(1);
      }
  
  
      // The command is the first token that is not a flag. It is NOT simply cargs[0]:
      // launchers legitimately put flags in front of it (bin/reactory prepends
      // `--silent`), and babel's own arguments precede it whenever a launcher omits the
      // `--` separator. Assuming index 0 left `command` null, and MultiStageJobRunner
      // guards on `if (job?.command)` — so the CLI booted the whole server, ran nothing,
      // printed "Goodbye." and exited 0. A silent no-op is the worst possible failure
      // mode here, so resolve the command positionally and fail loudly when there is none.
      //
      // `startsWith('-')` rather than `indexOf('-') === -1`: the latter also rejected any
      // hyphenated command name (e.g. `module-gen`).
      const commandIndex: number = cargs.findIndex(arg => !arg.startsWith('-'));
      let command: string = commandIndex === -1 ? null : cargs[commandIndex];
      let commandArgs: string[] = commandIndex === -1 ? [] : cargs.slice(commandIndex + 1);

      if (!command) {
        console.error(colors.red(t('cli:common.noCommand',
          `No command found in arguments: ${cargs.join(' ')}`)));
        process.exit(1);
      }
      let isServiceCall: boolean = false;
      let serviceMethod: string = null;
      let serviceProps: any = {};
      let servicePropsMap: Reactory.ObjectMap = null;
      let servicePropsBuilder: string = null;

      if (cargs.length >= 2) {
        for(let i = 2; i < vargs.length; i++) { 
          const [key, value] = vargs[i].split('=');
          switch(key) {
            case '-u':
            case '--user':
              {
                userName = value;
                break;
              }
            case '--password':
              {
                password = value;
                break;
              }
            case '-p':
            case '--partner':
              {
                partnerKey = value;
                break;
              }
            case '-svc':
            case '--service': 
              {
                serviceMethod = value;
                isServiceCall = true;
                break;
              }
            case '-svcp':
            case '--service-props': {
              serviceProps = eval(value);
              break;
            }
            case '-svcpm':
            case '--service-props-map': { 
              servicePropsMap = eval(value);
            }
            case '-svcpb':
            case '--service-props-builder': { 
              servicePropsBuilder = value;
            }
            default:
              {
                break;
              }
            }
        }
      }

      let jobs: Job[] = [];
      if(isServiceCall) {
        const propsBuilder = context.getService<Reactory.Service.IReactoryService & { build: ()=>Promise<any>  }>(servicePropsBuilder, {});
        if(propsBuilder) {
          const builtProps = await propsBuilder.build();
          serviceProps = { ...serviceProps, ...builtProps };
        }
        jobs = [
          {
            service: command,
            method: serviceMethod,
            params: serviceProps,
            props: serviceProps,
            propsMap: serviceProps            
          }
        ];
      } else {
        jobs = [
          {
            command,
            args: commandArgs
          }
        ];
      }

      config = {
        version: '1.0.0',
        user: userName,
        partner: partnerKey,
        password: password,
        jobs,
      }
    }

    if(config.partner) {
      //we will use the context, to get the 
      //partner service and get the partner.
      partner = await ReactoryClient.findOne({ key: config.partner });

      if(!partner) {
        console.error(colors.red(t('cli:common.invalidPartner', 'Partner not found Authentication Failure')));
        process.exit(1);
      }

      context.partner = partner;
    }

    if(config.user && config.password) { 
      //we will use the context, to get the 
      //user service and get the user.
      const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
      user = await userService.findUserWithEmail(userName);
      if(!user) {
        console.error(colors.red(t('cli:common.invalidUser', 'User Not Found')));
        process.exit(1);
      }

      const valid = await user.validatePassword(password);
      if(!valid) {
        console.error(colors.red(t('cli:common.invalidPassword', 'User Authentication Failure')));
        process.exit(1);
      } 

      context.user = user;
    }

    const rl = getReadline({
      prompt: 'reactory-cli> ',
      completer: (line: string) => {
        return getCompletions(line, context);
      },
    });

    const interactive = Boolean(process.stdin.isTTY);
    let shuttingDown = false;
    const shutdown = () => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(colors.green(t('cli:common.goodbye', 'Goodbye.')));
      process.exit(0);
    };

    // Only wire readline 'close' to terminate the process for an interactive
    // (TTY) session, where closing the REPL (Ctrl-D / quit) is the user's exit
    // signal. A non-TTY stdin (pipe, CI, background job, `sleep | cli.sh ...`)
    // hits EOF and emits 'close' immediately; wiring that to process.exit would
    // kill the process before the jobs finish. Non-interactive runs instead
    // terminate explicitly once MultiStageJobRunner has completed below.
    if (interactive) {
      rl.on('close', shutdown);
      rl.prompt(true);
    }

    context.readline = rl;

    await MultiStageJobRunner(config, context);

    // Jobs are complete: tear down the readline and exit. This is the sole exit
    // path for non-interactive runs, and also covers interactive runs whose
    // jobs return without the user closing the REPL.
    rl.close();
    shutdown();
  } catch (error) {
    console.error('Error occurred in main:', error);
    process.exit(1);
  }
}

export default ReactoryCli;