import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const requiredFields = [
  'key',
  'name',
  'username',
  'email',
  'salt',
  'password',
  'avatar',
  'siteUrl',
  'emailSendVia',
  'emailApiKey',
  'menus',
  'applicationRoles',
  'routes',
  'auth_config',
  'settings',
  'whitelist',
];

async function prompt(config: { [key: string]: any }, fieldName: string) {
  return new Promise((resolve, reject) => {
    rl.question(`Enter ${fieldName}: `, (answer) => {
      if (answer.trim() === '') {
        console.log(`Error: ${fieldName} cannot be empty`);
        return prompt(config, fieldName).then(resolve, reject);
      }
      config[fieldName] = answer.trim();
      resolve({fieldName, answer: answer.trim()});
    });
  });
}

async function main() {
  const config: { [key: string]: any } = {};

  for (const field of requiredFields) {
    await prompt(config, field);
  }

  const rootDir = './src';
  const dirs = ['authentication', 'menus', 'routes', 'settings', 'themes'];

  for (const dir of dirs) {
    fs.mkdirSync(path.join(rootDir, dir));
    fs.writeFileSync(path.join(rootDir, dir, 'index.ts'), `export * from './${dir}';\n`);
  }

  console.log('All directories created successfully');
  rl.close();
}

main().catch((err) => console.error(err));
