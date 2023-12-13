import  { inFile, outFile } from './file.ai.macro';
import { CreateChatCompletionRequest, CreateCompletionResponse } from 'openai';

export const REACTOR_MACRO_MD = require.resolve('./macros.md');

type MacroFunctions = {
  [macro: string]: (...params: any[]) => Promise<string>
};

// Usage
const inputMacros: MacroFunctions = {
  file: inFile,
  inFile,
};

const outputMacros: MacroFunctions = {
  out: outFile,
  outFile,
};

export async function handleUserResponse(userResponse: string): Promise<string> {
  // Extract macros and their parameters from the user response
  const regex = /@(\w+)\((.*?)\)/g;
  let match;
  let result = userResponse;

  while ((match = regex.exec(userResponse)) !== null) {
    const [macro, ...params] = match.slice(1);

    // Split the parameters by comma
    const splitParams = params[0].split(',');

    // Check if there is a function for this macro
    if (inputMacros[macro]) {
      // Replace the macro with the result of its function
      const replacement = await inputMacros[macro](...splitParams);
      result = result.replace(`@${macro}(${params[0]})`, replacement);      
    } else {
      // console.warn(`No function found for macro @${macro}`);
    }
  }

  return result;
}


export async function handleChatCompletionResponse(
  response: CreateCompletionResponse, 
  prompt: CreateChatCompletionRequest): Promise<CreateCompletionResponse> {

  const regex = /@(\w+)\((.*?)\)/g;

  // Clone the response to avoid mutating the original object
  const updatedResponse = JSON.parse(JSON.stringify(response));

  // Access message object
  const message = updatedResponse.choices[0].message;

  let match;
  const macros = message.role === 'system' || message.role === 'user' ? inputMacros : outputMacros;
  const input = prompt.messages[prompt.messages.length - 1];
  while ((match = regex.exec(input.content)) !== null) {
    const [macro, ...params] = match.slice(1);
    const splitParams = params[0].split(',');

    if (macros[macro]) {
      const replacement = await macros[macro]([...splitParams, message.content]);
      message.content = message.content.replace(`@${macro}(${params[0]})`, replacement);
    } else {
      console.warn(`No function found for macro @${macro}`);
    }
  }

  return updatedResponse;
}
