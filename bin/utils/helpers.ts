import crypto from 'crypto';
import fs from 'fs';
import readline, { ReadLine } from 'readline';
import $colors from 'colors/safe';
import Reactory from '@reactory/reactory-core';
import lodash from 'lodash';


// set theme
$colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

import {
  IClientConfiguration,
  IServerConfiguration,
  ReactoryConfiguration,
  IQuestion,
  IQuestionCollection,
  IQuestionGroup,
  QuestionHandlerResponse,
} from './config/config.types';

import { clientConfigTemplate, serverConfigTemplate } from './config/templates';

export const colors = $colors;

export const isHelpRequest = (response: string): boolean => response.charAt(0) === '?'.charAt(0);

export const strongRandom = () => {
  const randomBytes = crypto.randomBytes(32);
  const base64String = randomBytes.toString('base64');

  return base64String;
}

export const stripColorCodes = (input: string): string => {
  const ansiColorRegex = /\x1b\[[0-9;]*m/g; // matches any ANSI color code sequence
  return input.replace(ansiColorRegex, ''); // remove all matched sequences
}

/**
   * Asks a question and returns the response. If question is null, the configuration is persisted to the file system.
   * @param question 
   * @param $configuration 
   */
export const ask = (question: IQuestion, $configuration: ReactoryConfiguration, rl: ReadLine) => {
  if (question !== null && question !== undefined) {
    rl.question(`
      ${colors.yellow('[reactory]>')}${colors.green(`${question.question}`)}
      `, ($response: string) => {
      if (question.handler) {
        let { next, configuration } = question.handler(stripColorCodes($response), $configuration);
        ask(next, configuration as ReactoryConfiguration, rl);
      }
    });
  } else {
    rl.write(colors.green(`No more questions, goodbye!\r`));
    rl.close();
  }
}

export const persistClientConfiguration = (
  $configuration: IClientConfiguration, 
  environment: string = 'local', 
  rl: ReadLine, 
  next?: QuestionHandlerResponse): QuestionHandlerResponse => {
  const filename = `.env.${environment || $configuration.environment}`;
  const path = `${process.env.REACTORY_CLIENT}/config/env/${$configuration.name}`;

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }

  const writeFile = ($filename: string | null) => {
    const configData = lodash.template(clientConfigTemplate($configuration as IClientConfiguration))($configuration);
    fs.writeFileSync(`${path}/${$filename || filename}`, configData, { encoding: 'utf8', flag: 'w', mode: 0o666 });
    rl.write(`
${colors.yellow(`[reactory]`)}${colors.green(`Client Configuration written to file: ${path}/${$filename || filename}`)}
    `);

    if (next) {
      return next;
    }

    return { next: null, configuration: $configuration };
  }

  if (fs.existsSync(`${path}/${filename}`)) {
    const $filename = `${filename}-${new Date().valueOf()}`;
    rl.write(`
${colors.yellow(`[reactory]`)}${colors.green(`Client Configuration file exists, renaming to: ${path}/${$filename}`)}
    `);
    return writeFile($filename);
  } else {
    return writeFile(null);
  }
}

/**
 * 
 * @param $configuration 
 */
export const persistServerConfiguration = ($configuration: IServerConfiguration, environment: string = 'local', rl: ReadLine, next?: QuestionHandlerResponse): QuestionHandlerResponse => {
  const filename = `.env.${environment || $configuration.environment}`;
  const path = `${process.cwd()}/config/${$configuration.name}`;

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }

  let $filename = `${path}/${filename}`

  if (fs.existsSync($filename)) {
    const newFilename = `${path}/${filename}-${new Date().valueOf()}`;
    rl.write(`
    ${colors.yellow(`[reactory]`)}${colors.green(`Configuration file ${$filename} exists, renaming output to ${newFilename}...`)}
    `);
    $filename = newFilename
  }

  const configData = lodash.template(serverConfigTemplate($configuration as IServerConfiguration, $configuration.name))($configuration);
  fs.writeFileSync($filename, configData, { encoding: 'utf8', flag: 'w', mode: 0o666 });
  rl.write(`
    ${colors.yellow(`[reactory]`)}${colors.green(`Configuration written to file: ${$filename}`)}
    `);

  if (next) return next;
  else return { next: null, configuration: $configuration };
};