'use strict';
import readline from 'readline';
import { ask, colors } from '../helpers';
import {
  ReactoryConfiguration,
  IQuestion,
  QuestionHandlerResponse,
} from './config.types';

import { 
  DEFAULT_SERVER_CONFIG,
  serverConfigQuestions, 
  DEFAULT_CLIENT_CONFIG, 
  clientConfigQuestions 
} from './questions';

const main = (kwargs: string[]) => {

  let whichConfigs = "server";

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `> `,
    terminal: true,
  });

  if(kwargs.length > 0) {
    kwargs.forEach((arg) => {
      const [key, value] = arg.split('=');
      if(key === '--config_name') {
        DEFAULT_SERVER_CONFIG.name = value;
        DEFAULT_CLIENT_CONFIG.name = value;
      }

      if(key === '--config_env'){
        DEFAULT_SERVER_CONFIG.environment = value;
        DEFAULT_CLIENT_CONFIG.environment = value;
      }
    })
  }

  rl.prompt(true);

  rl.write(colors.yellow(`
+---------------------------------------------------------------------------+
| Welcome to the reactory configuration helper utility. This utility will   |\r
| walk you through creating a configuration file set to run a reactory      |\r
| server instance.  For more help on each question, respond with ? to get   |\r
| more help on the impact of each configuration entry.                      |\r
|                                                                           |\r
| If you are unsure of an entry, just hit enter and a default will be       |\r
| used. You can always change the values later.                             |\r
|                                                                           |\r
| Should you use defaults for all entries, the configuration will be        |\r
| written to the file system and the server will start with a reactory      |\r
| default local development configuration.                                  |\r
|                                                                           |\r
| For more information on the configuration file, please refer to the       |\r
| README.MD in the config/ directory.                                       |\r
|                                                                           |\r
|                 !!This tool is still under development!!                  |\r
+---------------------------------------------------------------------------+
`));

  const isHelpRequest = (response: string): boolean => response.charAt(0) === '?'.charAt(0);


  const configureAnotherServerConfig: IQuestion = {
    question: 'Would you like to create another configuration? (y/n)',
    handler: (response: string, configuration) => {
      if (response === 'n') {
        return null;
      } else {
        return { next: serverConfigQuestions(rl).required.name, configuration };
      }
    }
  }
 

  

  const configurationSelection = {
    question: `What type of configuration would you like to create?
      1 --> Server Configuration
      2 --> Application Client Configuration
      Q --> Quit`,
    handler: function (response: string, configuration: ReactoryConfiguration): QuestionHandlerResponse {
      const serverHandler = {
        next: serverConfigQuestions(rl, { configuration, next: configurationSelection }).required.name,
        configuration: { ...configuration, ...DEFAULT_SERVER_CONFIG },
      }

      const clientHandler = {
        next: clientConfigQuestions(rl, { configuration, next: configurationSelection }).required.name, 
        configuration: { ...configuration, ...DEFAULT_CLIENT_CONFIG },
      }
      if (response === '1') {
        whichConfigs = 'server';
        return serverHandler;
      }

      if (response === '2') {
        whichConfigs = 'client';
        return clientHandler;
      }

      // if (response === '3') {
      //   whichConfigs = 'both';
      //   return { next: serverConfigQuestions(rl, clientHandler).required.name, configuration };
      // }

      if (response === 'q' || response === 'Q') {
        return { next: null, configuration };
      }

      if (isHelpRequest(response)) {
        rl.write(colors.grey(`
  This is the first question you will be asked. You can choose to create a server configuration,
  an application client configuration.
          `));

        return { next: configurationSelection, configuration };
      }

      rl.write(colors.red('Invalid response. Please try again.'));

      return { next: configurationSelection, configuration };
    },
  }

  const startConfiguration = () => {
    ask(configurationSelection, DEFAULT_SERVER_CONFIG, rl);
  }

  startConfiguration();

  rl.on('close', () => {
    console.log('Goodbye.')
  });
}

main(process.argv);