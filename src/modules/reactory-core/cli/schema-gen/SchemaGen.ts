import Reactory from "@reactory/reactory-core";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ReadLine } from "readline";
import colors from "colors/safe";
import { ENVIRONMENT } from "@reactory/server-core/types/constants";

// set theme
colors.setTheme({
  silly: "rainbow",
  input: "grey",
  verbose: "cyan",
  prompt: "grey",
  info: "green",
  data: "grey",
  help: "cyan",
  warn: "yellow",
  debug: "blue",
  error: "red",
});

const HelpText = `
The SchemaGenCli function is used as a CLI plugin for the Reactory CLI tool.
The SchemaGenCli function is used to generate schemas for your forms in your reactory modules.

The command line interface for the SchemaGenCli is as follows:
parameters:
-m --module <module-name> eg -m core
-f --form <form-name> eg -f user
-c --config <config-file> eg -c ./path/to/config.json / -c ./path/to/config.yaml
-g --generator <generator-name> eg -g PostgresTableToFormGenerator
-l --list-generators
-gargs --generator-args <generator-args> eg -gargs 'arg1=val1,arg2=val2'
-o --output <output-folder> eg -o ./path/to/output
-h --help,
-v --verbose
`;

type ReactoryCliApp = Reactory.Server.TCli;

interface ConfigFile<TOptions = any> {
  module?: string;
  form?: string;
  generator: string;
  options: TOptions;
  output?: string | "state" | "console";
  format?: string | "json" | "yaml";
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
const SchemaGenCli = async (
  kwargs: string[],
  context: Reactory.Server.IReactoryContext
): Promise<void> => {
  if (kwargs.length === 0) {
    context.error(`No arguments provided`);
    process.exit(1);
  }

  if (context === undefined || context === null) {
    context.error(`No context provided`);
    process.exit(1);
  }

  const { modules, state } = context;

  const rl: ReadLine = context.readline as ReadLine;

  let module: string = "";
  let form: string = "";
  let config: string = "";
  let generator: string = "";
  let listGenerators: boolean = false;
  let generatorArgs: any = {};
  let output: string = "";
  let format: string = "json";
  let options: any = {};
  let help: boolean = false;
  let verbose: boolean = false;

  for (let i = 0; i < kwargs.length; i++) {
    let arg: string;
    let argv: string | boolean = null;
    if (kwargs[i].indexOf("=") === -1) {
      arg = kwargs[i];
      argv = true;
    } else {
      arg = kwargs[i].split("=")[0];
      argv = kwargs[i].split("=")[1];
    }

    switch (arg) {
      case "-m":
      case "--module":
        module = argv as string;
        break;
      case "-f":
      case "--form":
        form = argv as string;
        break;
      case "-fmt":
      case "--format": {
        format = argv as string;
        break;
      }
      case "-c":
      case "--config":
        config = argv as string;
        break;
      case "-g":
      case "--generator":
        generator = argv as string;
        break;
      case "-l":
      case "--list":
        listGenerators = true;
        break;
      case "-gargs":
      case "--generator-args":
        // convert the kvp string to an object
        const args = argv as string;
        const argArray = args.split(",");
        argArray.forEach((arg) => {
          const [key, value] = arg.split("=");
          generatorArgs[key] = value;
        });
        break;
      case "-o":
      case "--output":
        output = argv as string;
        break;
      case "-h":
      case "--help":
        help = true;
        break;
      case "-v":
      case "--verbose":
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
    rl.write(colors.green("Listing generators..."));
    let generatorServices = context.listServices({
      type: "schemaGeneration",
    });

    generatorServices = [
      ...generatorServices,
      ...context.listServices({
        type: "codeGeneration",
      }),
    ];

    generatorServices.forEach((service) => {
      rl.write(
        colors.green(`
  ${service.nameSpace}.${service.name}@${service.version}
  ${service.description}
`)
      );
    });

    process.exit(0);
  }

  if (config) {
    rl.write(colors.green(`Loading configuration file: ${config}\n`));
    // load the config file
    // resolve the config file location
    const file = path.resolve(config);
    if (!fs.existsSync(file)) {
      context.error(`Configuration file not found: ${file}`);
      process.exit(1);
    }

    const fileText = fs.readFileSync(file, "utf8");
    let configData: ConfigFile = {
      generator: "",
      options: {},
    };

    if (file.indexOf(".json") > -1) {
      //load json
      try {
        configData = JSON.parse(fileText);
      } catch (error) {
        context.error(`Error parsing JSON file: ${file}`);
        process.exit(1);
      }
    } else if (file.indexOf(".yaml") > -1) {
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

    if (configData.format) {
      format = configData.format;
    }
  }

  if (generator === "") {
    context.error(`No generator provided`);
    process.exit(1);
  }

  let generatorService: Reactory.Forms.ReactoryFormGeneratorService<
    unknown,
    unknown
  > = null;

  try {
    generatorService = context.getService<
      Reactory.Forms.ReactoryFormGeneratorService<unknown, unknown>
    >(generator, generatorArgs);
  } catch (error) {
    context.error(`Error loading generator: ${generator}`);
    process.exit(1);
  }

  if (!generatorService) {
    context.error(`Generator not found: ${generator}`);
    process.exit(1);
  }

  if (
    generatorService.generate &&
    typeof generatorService.generate === "function"
  ) {
    const forms = await generatorService.generate();

    switch (output) {
      case "state": {
        let state_key = ReactorCliAppDefinition.toString(true);
        context.state[state_key] = forms;
        break;
      }
      case "console": {
        forms.forEach((form) => {

          let contents = "";
          switch(format) {            
            case "yaml": {
              contents = yaml.dump(form);
              break;
            }
            case "ts": {
              contents = `export default ${JSON.stringify(form, null, 2)}`
              break;
            }
            case "json":
            default: {
              contents = JSON.stringify(form, null, 2);
              break;
            }
          }

          rl.write(
            colors.green(
              `Generated: ${form.nameSpace}.${form.name}@${form.version}\n`
            )
          );
          rl.write(colors.yellow(contents));
          rl.write(
            colors.grey(
              "\n============================================================\n"
            )
          );
        });
        break;
      }
      case "storage": {
        // store the output in mongo or some other storage
        break;
      }
      default: {
        //check if the output a template string
        let _destination = path.resolve(
          path.join(ENVIRONMENT.REACTORY_DATA, "schemas/generated")
        );

        if (output.indexOf("${") > -1) {
          _destination = context.utils.lodash.template(output)({
            forms,
            env: process.env,
            context,
          });
        }

        if (!fs.existsSync(_destination)) {
          fs.mkdirSync(_destination, { recursive: true });
        }

        rl.write(colors.green(`Writing to output folder: ${_destination}\n`));

        forms.forEach((form) => {
          const fileName = `${form.name}.${format}`;
          const filePath = path.resolve(_destination, fileName);
          let contents = "";
          switch(format) {
            case "yaml": {
              contents = yaml.dump(form);
              break;
            }
            case "ts": {
              contents = `export default ${JSON.stringify(form, null, 2)}`;
              break;
            }
            case "json":
            default: {
              contents = JSON.stringify(form, null, 2);
              break;
            }
          }
          fs.writeFileSync(filePath, contents);
        });

        break;
      }
    } 
  } else {
    context.error(`Generator does not have a generate method`);
    process.exit(1);
  }

  rl.write(colors.green(`Generation complete.\n`));
};

/**
 * ReactorCliApp definition
 */
const ReactorCliAppDefinition: Reactory.IReactoryComponentDefinition<ReactoryCliApp> =
  {
    nameSpace: "core",
    name: "SchemaGen",
    version: "1.0.0",
    description: HelpText,
    component: SchemaGenCli as unknown as ReactoryCliApp,
    domain: Reactory.ComponentDomain.plugin,
    features: [
      {
        feature: "SchemaGen",
        featureType: Reactory.FeatureType.function,
        action: ["generate", "schema-generate"],
        stem: "generate",
      },
    ],
    overwrite: false,
    roles: ["USER"],
    stem: "manager",
    tags: ["schema", "cli", "generator"],
    toString(includeVersion) {
      return includeVersion
        ? `${this.nameSpace}.${this.name}@${this.version}`
        : this.name;
    },
  };

export default ReactorCliAppDefinition;
