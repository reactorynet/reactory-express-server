import { colors, stripColorCodes } from '../helpers';
import readline, { ReadLine } from 'readline';
import { Configuration, OpenAIApi } from "openai";
import { IQuestion, ChatState } from './chat.types';
import { ChatFactory, SYSTEM_INITIALIZER_MESSAGE } from './questions/factory';

const DEFAULT_MODEL_ID = 'gpt-3.5-turbo-0301';

/**
 * Asks a question and returns the response. If question is null, the configuration is persisted to the file system.
 * @param question 
 * @param $configuration 
 */
export const ask = async (question: IQuestion, state: ChatState, rl: ReadLine): Promise<void> => {
  return new Promise((resolve) => {
    if (question !== null && question !== undefined) {
      rl.question(`
        ${colors.yellow('[reactory]>')}${colors.green(`${question.question}`)}
        `, async ($response: string) => {
        if (question.handler) {
          const handlerResponse = await question.handler(stripColorCodes($response), state);
          resolve(ask(handlerResponse.next, handlerResponse.state, rl));
        }
      });
    } else {
      rl.write(colors.green(`No more questions, goodbye!\r`));
      rl.close();
      resolve();
    }
  });
}


const main = async (kwargs: string[]) => {

  let apiKey = process.env.OPENAI_API_KEY;
  let apiOrg = process.env.OPENAI_ORG;
  let modelId = process.env.OPENAI_DEFAULT_MODEL_ID || DEFAULT_MODEL_ID;

  const modelState: ChatState = {
    modelId: modelId || DEFAULT_MODEL_ID,
    started: new Date(),
    history: [
      SYSTEM_INITIALIZER_MESSAGE
    ],
    apiKey,
    apiOrg,
    ai: new OpenAIApi(new Configuration({
      organization: apiOrg,
      apiKey: apiKey,
    })),
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `> `,
    terminal: true,
  });

  rl.on('close', () => {
    console.log('Goodbye.')
    process.exit(0);
  });

  if (kwargs.length > 0) {
    kwargs.forEach((arg) => {
      const [key, value] = arg.split('=');
      if (key === '--apikey') {
        apiKey = value;
      } 

      if (key === '--apiorg') {
        apiOrg = value;
      }

      if (key === '--modelid') {
        modelId = value;
      }
    })
  }

  

  rl.prompt(true);

  rl.write(colors.yellow(`
+---------------------------------------------------------------------------+
| Welcome to the reactory ai helper utility. This utility will help you     |\r
| perform some basic AI (chatgpt) specific operations against the code base.|\r
| For more help on each question, respond with ? to get more help on the    |\r
| use of each prompt.                                                       |\r
|                                                                           |\r
|                 !!This tool is still under development!!                  |\r
+---------------------------------------------------------------------------+
`));

if(!apiKey || !apiOrg) {
  rl.write(colors.yellow(`
  +---------------------------------------------------------------------------+
  | Error: You must provide an apikey and apivalue to use this tool.          |\r
  | Add the following keys in your environment file                           |\r
  |    * OPENAI_API_KEY                                                       |\r
  |    * OPENAI_ORG                                                           |\r
  | or specify the values in the command line using the params                |\r
  |    * --apikey=<your api key>                                              |\r
  |    * --apiorg=<your api value>                                            |\r
  +---------------------------------------------------------------------------+
  `));
  rl.close();
  return;
}

try {
  const configuration = new Configuration({
    organization: apiOrg,
    apiKey: apiKey,
  });

  const openai = new OpenAIApi(configuration);
  
  if(!modelId || modelId === '' || modelId === 'select') {
    const modelListData = await openai.listModels();

    let responseText = '';

    modelListData.data?.data?.forEach((model) => {
      responseText += `[id: ${model.id}] Owner: ${model.owned_by} Created: ${new Date(model.created * 1000).toISOString()} \r`;
    });

    rl.write(colors.yellow(`
+---------------------------------------------------------------------------+
| Please select the model you want to use for interaction.                  |\r
|                                                                           |\r
+---------------------------------------------------------------------------+
${responseText}
`));
}
  await ask(ChatFactory(rl, modelState), modelState, rl);
  rl.close();
} catch (ex) {
  rl.write(colors.yellow(`
+---------------------------------------------------------------------------+
| Error: ${ex}                                                              |\r
+---------------------------------------------------------------------------+
  `));
  rl.close();
  return;
}
};

main(process.argv);