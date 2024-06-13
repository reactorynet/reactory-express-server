import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ReadLine } from 'readline';
import colors from 'colors/safe';

// set theme
colors.setTheme({
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

const HelpText = `
The SchemaGenCli function is used as a CLI plugin for the Reactory CLI tool.
The SchemaGenCli function is used to generate schemas for your forms in your reactory modules.

The command line interface for the SchemaGenCli is as follows:
parameters:
-m --module <module-name> eg -m core
-f --form <form-name> eg -f user
-c --config <config-file> eg -c ./path/to/config.json / -c ./path/to/config.yaml
-g --generator <generator-name> eg -g mongoose
-l --list-generators
-gargs --generator-args <generator-args> eg -gargs 'arg1=val1,arg2=val2'
-o --output <output-folder> eg -o ./path/to/output
-h --help,
-v --verbose
`;

type ReactoryCliApp = (vargs: string[], context: Reactory.Server.IReactoryContext) => Promise<void>

interface ConfigFile { 
  module?: string;
  form?: string;
  generator: string;
  options: any;
  output?: string;
}

/**
 * The SchemaGenCli function is used as a CLI plugin for the Reactory CLI tool. 
 * The SchemaGenCli function is used to generate schemas for your forms in your reactory modules.
 * 
 * The command line interface for the SchemaGenCli is as follows:
 * parameters:
 * -m --module <module-name> eg -m core
 * -f --form <form-name> eg -f user
 * -c --config <config-file> eg -c ./path/to/config.json / -c ./path/to/config.yaml
 * -g --generator <generator-name> eg -g mongoose
 * -l --list-generators
 * -gargs --generator-args <generator-args> eg -gargs 'arg1=val1,arg2=val2'
 * -o --output <output-folder> eg -o ./path/to/output  
 * -h --help
 * @param kwargs 
 * @param context 
 */
const SchemaGenCli = async (kwargs: string[], context: Reactory.Server.IReactoryContext): Promise<void> => { 
  if (kwargs.length === 0) {
    context.error(`No arguments provided`);
    process.exit(1);
  }

  if (context === undefined || context === null) {
    context.error(`No context provided`);
    process.exit(1);
  }

  const { 
    modules,
  } = context;

  const rl: ReadLine = context.readline as ReadLine;

  let module: string = '';
  let form: string = '';
  let config: string = '';
  let generator: string = '';
  let listGenerators: boolean = false;
  let generatorArgs: any = {};
  let output: string = '';
  let help: boolean = false;
  let verbose: boolean = false;

  for (let i = 0; i < kwargs.length; i++) {
    let arg: string;
    let argv: string | boolean = null;
    if (kwargs[i].indexOf('=') === -1) {
      arg = kwargs[i];
      argv = true;
    } else {
      arg = kwargs[i].split('=')[0];
      argv = kwargs[i].split('=')[1];
    }

    switch (arg) {
      case '-m':
      case '--module':
        module = argv as string;
        break;
      case '-f':
      case '--form':
        form = argv as string;
        break;
      case '-c':
      case '--config':
        config = argv as string;
        break;
      case '-g':
      case '--generator':
        generator = argv as string;
        break;
      case '-l':
      case '--list-generators':
        listGenerators = true;
        break;
      case '-gargs':
      case '--generator-args':
        // convert the kvp string to an object
        const args = argv as string;
        const argArray = args.split(',');
        argArray.forEach((arg) => {
          const [key, value] = arg.split('=');
          generatorArgs[key] = value;
        });
        break;
      case '-o':
      case '--output':
        output = argv as string;
        break;
      case '-h':
      case '--help':
        help = true;
        break;
      case '-v':
      case '--verbose':
        verbose = true;
        break;
      default:
        context.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  if (help) {
    rl.write(colors.green(HelpText));
  }

  if (listGenerators) {
    rl.write(colors.green(`Listing generators...\n`));
  }

  if (config) {
    rl.write(colors.green(`Loading configuration file: ${config}\n`));
    //load the config file
    // resolve the config file location
    const file = path.resolve(config);
    if (!fs.existsSync(file)) {
      context.error(`Configuration file not found: ${file}`);
      process.exit(1);
    }

    const fileText = fs.readFileSync(file, 'utf8')
    let configData: ConfigFile = {
      generator: '',
      options: {}
    };

    if (file.indexOf('.json') > -1) {
      //load json
      try {
        configData = JSON.parse(fileText);
      } catch (error) {
        context.error(`Error parsing JSON file: ${file}`);
        process.exit(1);
      }

    } else if (file.indexOf('.yaml') > -1) {
      //load yaml
      try {
        configData = yaml.load(fileText) as ConfigFile;
      } catch (error) { 
        context.error(`Error parsing YAML file: ${file}`);
        process.exit(1);
      }
    }

    if (configData.module) {
      module = configData.module;
    }

    if (configData.form) {
      form = configData.form;
    }

    if (configData.generator) {
      generator = configData.generator;
    }

    if (configData.options) {
      generatorArgs = configData.options;
    }

    if (configData.output) {
      output = configData.output;
    }
  }
  
  const generatorService = context.getService(generator, generatorArgs, context);

  if (!generatorService) {
    context.error(`Generator not found: ${generator}`);
    process.exit(1);
  }

  if(generatorService.generate && typeof generatorService.generate === 'function') { 
    const forms = await generatorService.generate({
      module,
      form,
      generatorArgs
    }, context);

    if (output) {
      rl.write(colors.green(`Writing to output folder: ${output}\n`));
      const outputFolder = path.resolve(output);
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      forms.forEach((form) => {
        const fileName = `${form.name}.json`;
        const filePath = path.resolve(outputFolder, fileName);
        fs.writeFileSync(filePath, JSON.stringify(form, null, 2));
      });
    } else {
      forms.forEach((form) => {
        rl.write(colors.green(`Form: ${form.name}\n`));
        rl.write(colors.green(`Fields: ${form.fields.length}\n`));
        rl.write(colors.green(`Relations: ${form.relations.length}\n`));
      });
    }
  }
  
  rl.write(colors.green(`Generation complete.\n`));
}


/**
 * ReactorCliApp definition
 */
const ReactorCliAppDefinition: Reactory.IReactoryComponentDefinition<ReactoryCliApp> = {
  nameSpace: 'core',
  name: 'SchemaGen',
  version: '1.0.0',
  description: HelpText,
  component: SchemaGenCli,
  domain: Reactory.ComponentDomain.generator,
  features: [{
    feature: 'SchemaGen',
    featureType: Reactory.FeatureType.function,
    action: ['generate', 'schema-generate'],
    stem: 'generate',
  }],
  overwrite: false,
  roles: ['USER'],
  stem: 'manager',
  tags: ['schema', 'cli', 'generator'],
  toString(includeVersion) {
    return includeVersion ? `${this.nameSpace}.${this.name}@${this.version}` : this.name;
  },

}

export default ReactorCliAppDefinition