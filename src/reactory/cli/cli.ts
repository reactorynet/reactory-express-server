import fs from 'fs';
import { template } from 'lodash';
import readline from 'readline';
import yaml from "js-yaml";
import Reactory from '@reactory/reactory-core';
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

  if(name.indexOf('@') > 0 || name.indexOf('.') > 0) { 
    // uses regex to find the cli. name, could be in the following formats:
    // reactory.ReactorCLI@1.0.0
    // reactory.ReactorCLI
    // ReactorCLI
    const regex = /([a-zA-Z0-9]+)\.([a-zA-Z0-9]+)@?([0-9\.]*)/;
    const matches: Reactory.IReactoryComponentDefinition<TCLI>[] = []
    ALL_COMMANDS.forEach((cli) => {
      const fqn = `${cli.nameSpace}.${cli.name}@${cli.version}`;
      const match = fqn.match(regex);
      if(match) {
        matches.push(cli);
      }
    });
    
    if(matches.length > 1) {
      throw new Error(`Multiple matches found for ${name}. Please specify the full name of the cli.`);
    }

    if(matches.length === 1) {
      found = matches[0];
    }
  } else {
    //find the cli by name
    ALL_COMMANDS.forEach((cli) => {
      if(cli.name.toLowerCase() === name.toLowerCase()) {
        found = cli;
      }
    });
  }

  return found;
}

/**
 * Processes the command line arguments for the cli. We allow the 
 * user to specify the environment, user, password, partner, etc.
 * and then return the remaining arguments to be processed by the
 * command.
 * -cf, --config: The configuration file to use for the command.
 * --cname: The environment name to use for the command. (this value is used by the cli.sh and cli.cmd file)
 * --cenv: The environment to use for the command. (this value is used by the cli.sh file)
 * -p, --partner: The partner to use for the command.
 * -u, --user: The user to use for the command.
 * -pwd, --password: The password to use for the command.
 * -h, --help: Show help for reactory cli.
 * --list <module>: List all the commands available for a module.
 * --modules: List all the modules available.
 */
const processCliArgs = async (vargs: string[]): Promise<string[]> => {
  let ignore: string[] = ['--cname', '--env', '-p', '--partner', '-u', '--user', '-pwd', '--password']
  let action: string[] = ['--list', '--modules', '-h', '--help', '-v', '--version'];
  vargs.forEach((arg) => {
    let KP:string[] = [null, null];
    if(arg.trim().includes('=')) {
      KP = arg.split('=');
    }

    if(arg.trim().includes(' ')) {
      KP = arg.split(' ');
    }

    if(arg.trim().includes(':')) {
      KP = arg.split(':');
    }

    if(KP[0] === null) {
      KP[0] = arg;
    }
    
    const [key, value] = KP;

    if(action.includes(key)) {
      //we have to process this action.
      switch(key) {
        case '--list': {
          //list all commands available for a module.
          let commandsText = '';

          if(value === undefined || value === null || value === '') {
            ReactoryModules.enabled.forEach((module) => {              
              if (module.cli?.length > 0) {
                module.cli.forEach((cli) => {
                  commandsText += `${cli.nameSpace}.${cli.name}@${cli.version}\n`;
                });
              }              
            });
          } else {
            ReactoryModules.enabled.forEach((module) => {
              const fqn = `${module.nameSpace}.${module.name}@${module.version}`;
              if (module.name.toLowerCase() === value.toLowerCase() || fqn === value) {
                if (module.cli?.length > 0) {
                  module.cli.forEach((cli) => {
                    commandsText += `${cli.nameSpace}.${cli.name}@${cli.version}\n`;
                  });
                }
              }
            });
          }
          console.log(colors.green(`Listing all commands ${value ? `for module ${value}`: ''}\n${commandsText}`));
          break;
        }
        case '--modules': {
          //list all modules that are available.
          let modulesText = '';
          ReactoryModules.enabled.forEach((module) => {
            modulesText += `${module.nameSpace}.${module.name}@${module.version}}\n`;
          });
          console.log(colors.green(`Listing all modules available.\n${modulesText}`));

          break;
        }
        case '-h': {
          //show help for the reactory cli.
          console.log(colors.green(`Showing help for the reactory cli.\n`));
          console.log(colors.green(fs.readFileSync(require.resolve('./help.txt')).toString()));

          break;
        }
      }
    }
  });


  return [];
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
      if(cli && cli.component) {
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
        sync = true,
      } = job as ServiceJob;

      const svc = context.getService(service, {});
      // @ts-ignore
      if(typeof svc[method] === 'function') {
        if (sync === true) 
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

    

    // TODO: this needs to change once compiled and the additional args 
    // from babel is removed.
    // copy the vargs to a new array as we will be potentially modifying it.
    let cargs: string[] = [...vargs.slice(4)];
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
  
  
      let command: string = cargs.length >= 1 && cargs[0].indexOf('-') === -1 ? cargs[0] : null;
      let commandArgs: string[] = cargs.length >= 2 ? cargs.slice(1) : [];
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
            case '-pwd':
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

    rl.on('close', () => {
      console.log(colors.green(t('cli:common.goodbye', 'Goodbye.')))
      process.exit(0);
    });

    rl.prompt(true);

  
    context.readline = rl;

    await MultiStageJobRunner(config, context);

    rl.close();
  } catch (error) {
    console.error('Error occurred in main:', error);
    process.exit(1);
  }
}

export default ReactoryCli;