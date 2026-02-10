import Reactory from "@reactory/reactory-core";
import fs from "fs";
import path from "path";
import { ReadLine } from "readline";
import colors from "colors/safe";
import type { IServiceGenerator, ServiceGenerationOptions, ServiceGenerationResult } from "../../services/generators/service/types";

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
The ServiceGen CLI tool generates TypeScript service classes from YAML definitions.

Parameters:
  -c --config <yaml-file>           Path to the service definition YAML file
  -d --directory <path>             Path to directory containing multiple service.yaml files
  -o --output <output-folder>       Path to the output folder (default: current directory)
  -f --format <format>              Output format: ts or js (default: ts)
  --template <template-path>        Path to custom EJS template file
  --overwrite                       Overwrite existing files
  --generate-tests                  Generate unit test files
  --generate-readme                 Generate README documentation
  --dry-run                         Validate definitions without generating files
  -l --list-generators              List all available code generators
  -v --verbose                      Enable verbose output
  -h --help                         Show this help message

Examples:
  # Generate service from YAML
  reactory service-gen -c ./service.yaml -o ./src/services

  # Generate with tests and README
  reactory service-gen -c ./service.yaml -o ./src/services --generate-tests --generate-readme

  # Generate from directory
  reactory service-gen -d ./services -o ./src/generated

  # Dry run (validate only)
  reactory service-gen -c ./service.yaml --dry-run

  # List available generators
  reactory service-gen -l
`;

type ReactoryCliApp = Reactory.Server.TCli;

/**
 * ServiceGen CLI command for generating TypeScript services from YAML definitions
 * @param kwargs Command line arguments
 * @param context Reactory context
 */
const ServiceGenCli = async (
  kwargs: string[],
  context: Reactory.Server.IReactoryContext
): Promise<void> => {
  const rl: ReadLine = context.readline as ReadLine;

  // Debug: Log what we received  
  console.log(colors.cyan(`\nServiceGen CLI invoked with ${kwargs.length} arguments`));
  if (kwargs.length > 0) {
    console.log(colors.gray(`Arguments: ${JSON.stringify(kwargs)}\n`));
  }

  if (kwargs.length === 0) {
    context.error("No arguments provided. Use -h or --help for usage information.");
    process.exit(1);
  }

  if (!context) {
    context.error("No context provided");
    process.exit(1);
  }

  // Parse command line arguments
  let configFile = "";
  let directory = "";
  let output = process.cwd();
  let format: "ts" | "js" = "ts";
  let templatePath = "";
  let overwrite = false;
  let generateTests = false;
  let generateReadme = false;
  let dryRun = false;
  let listGenerators = false;
  let help = false;
  let verbose = false;

  for (let i = 0; i < kwargs.length; i++) {
    let arg: string;
    let argv: string | boolean = null;

    if (kwargs[i].indexOf("=") === -1) {
      arg = kwargs[i];
      // Check if next argument is a value (doesn't start with -)
      if (i + 1 < kwargs.length && !kwargs[i + 1].startsWith('-')) {
        argv = kwargs[i + 1];
        i++; // Skip the next argument as we've consumed it
      } else {
        argv = true;
      }
    } else {
      arg = kwargs[i].split("=")[0];
      argv = kwargs[i].split("=")[1];
    }

    switch (arg) {
      case "-c":
      case "--config":
        configFile = argv as string;
        break;
      case "-d":
      case "--directory":
        directory = argv as string;
        break;
      case "-o":
      case "--output":
        output = argv as string;
        break;
      case "-f":
      case "--format":
        format = argv as "ts" | "js";
        break;
      case "--template":
        templatePath = argv as string;
        break;
      case "--overwrite":
        overwrite = true;
        break;
      case "--generate-tests":
        generateTests = true;
        break;
      case "--generate-readme":
        generateReadme = true;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "-l":
      case "--list-generators":
      case "--list":
        listGenerators = true;
        break;
      case "-v":
      case "--verbose":
        verbose = true;
        break;
      case "-h":
      case "--help":
        help = true;
        break;
      default:
        // If it looks like a file path, treat it as config
        if (typeof argv === 'string' && (argv.endsWith('.yaml') || argv.endsWith('.yml'))) {
          configFile = argv;
        } else {
          context.error(`Unknown argument: ${arg}`);
          process.exit(1);
        }
    }
  }

  // Show help
  if (help) {
    rl.write(colors.green(HelpText));
    process.exit(0);
  }

  // List generators
  if (listGenerators) {
    rl.write(colors.green("Available Code Generators:\n\n"));
    const generatorServices = [
      ...context.listServices({ type: "codeGeneration" }),
      ...context.listServices({ type: "schemaGeneration" }),
    ];

    if (generatorServices.length === 0) {
      rl.write(colors.yellow("No generators found.\n"));
    } else {
      generatorServices.forEach((service) => {
        rl.write(colors.cyan(`  ${service.nameSpace}.${service.name}@${service.version}\n`));
        rl.write(colors.gray(`  ${service.description}\n`));
        rl.write("\n");
      });
    }
    process.exit(0);
  }

  // Validate inputs
  if (!configFile && !directory) {
    context.error("Either --config or --directory must be specified");
    rl.write(colors.yellow("\nUse -h or --help for usage information.\n"));
    process.exit(1);
  }

  if (configFile && directory) {
    context.error("Cannot specify both --config and --directory");
    process.exit(1);
  }

  // Get the ServiceGenerator service
  let serviceGenerator: IServiceGenerator;
  try {
    serviceGenerator = context.getService<IServiceGenerator>("core.ServiceGenerator@1.0.0");
  } catch (error) {
    context.error(`Failed to load ServiceGenerator: ${error.message}`);
    process.exit(1);
  }

  if (!serviceGenerator) {
    context.error("ServiceGenerator service not available");
    process.exit(1);
  }

  // Prepare generation options
  const options: ServiceGenerationOptions = {
    outputDir: path.resolve(output),
    format,
    templatePath: templatePath ? path.resolve(templatePath) : undefined,
    overwrite,
    generateTests,
    generateReadme,
  };

  if (verbose) {
    rl.write(colors.cyan("Configuration:\n"));
    rl.write(colors.gray(`  Output Directory: ${options.outputDir}\n`));
    rl.write(colors.gray(`  Format: ${format}\n`));
    rl.write(colors.gray(`  Overwrite: ${overwrite}\n`));
    rl.write(colors.gray(`  Generate Tests: ${generateTests}\n`));
    rl.write(colors.gray(`  Generate README: ${generateReadme}\n`));
    if (templatePath) rl.write(colors.gray(`  Custom Template: ${templatePath}\n`));
    rl.write("\n");
  }

  let results: ServiceGenerationResult[] = [];

  try {
    // Generate from single config file
    if (configFile) {
      const configPath = path.resolve(configFile);
      
      if (!fs.existsSync(configPath)) {
        context.error(`Configuration file not found: ${configPath}`);
        process.exit(1);
      }

      if (verbose) {
        rl.write(colors.cyan(`Processing: ${configPath}\n`));
      }

      // Dry run - validate only
      if (dryRun) {
        rl.write(colors.yellow("Dry run mode - validating definition...\n"));
        const definition = await serviceGenerator.parseDefinition(configPath);
        const validation = serviceGenerator.validate(definition);

        if (validation.valid) {
          rl.write(colors.green("✓ Definition is valid\n"));
          if (validation.warnings.length > 0) {
            rl.write(colors.yellow("\nWarnings:\n"));
            validation.warnings.forEach(w => {
              rl.write(colors.yellow(`  - ${w.path}: ${w.message}\n`));
            });
          }
        } else {
          rl.write(colors.error("\n✗ Validation failed:\n"));
          validation.errors.forEach(e => {
            rl.write(colors.error(`  - ${e.path}: ${e.message}\n`));
          });
          process.exit(1);
        }
        process.exit(0);
      }

      // Generate service
      const result = await serviceGenerator.generateFromFile(configPath, options);
      results.push(result);
    }

    // Generate from directory
    if (directory) {
      const dirPath = path.resolve(directory);

      if (!fs.existsSync(dirPath)) {
        context.error(`Directory not found: ${dirPath}`);
        process.exit(1);
      }

      if (!fs.statSync(dirPath).isDirectory()) {
        context.error(`Path is not a directory: ${dirPath}`);
        process.exit(1);
      }

      if (verbose) {
        rl.write(colors.cyan(`Scanning directory: ${dirPath}\n`));
      }

      results = await serviceGenerator.generateFromDirectory(dirPath, options);
    }

    // Report results
    console.log("\n");
    console.log(colors.cyan("=".repeat(60)));
    console.log(colors.cyan("Generation Results:"));
    console.log(colors.cyan("=".repeat(60)));
    console.log("");

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result) => {
      if (result.success) {
        successCount++;
        console.log(colors.green(`✓ ${result.serviceDefinition.id}`));
        
        if (verbose && result.files.length > 0) {
          console.log(colors.gray("  Generated files:"));
          result.files.forEach(file => {
            console.log(colors.gray(`    - ${file}`));
          });
        }

        if (result.warnings.length > 0) {
          console.log(colors.yellow("  Warnings:"));
          result.warnings.forEach(warning => {
            console.log(colors.yellow(`    - ${warning}`));
          });
        }
      } else {
        failureCount++;
        const serviceName = result.serviceDefinition ? result.serviceDefinition.id : "Unknown";
        console.log(colors.red(`✗ ${serviceName}`));
        console.log(colors.red(`  Error: ${result.error}`));
        
        if (result.warnings.length > 0) {
          console.log(colors.yellow("  Warnings:"));
          result.warnings.forEach(warning => {
            console.log(colors.yellow(`    - ${warning}`));
          });
        }
      }
      console.log("");
    });

    // Summary
    console.log(colors.cyan("=".repeat(60)));
    console.log(colors.cyan("Summary:"));
    console.log(colors.green(`  ✓ Successful: ${successCount}`));
    if (failureCount > 0) {
      console.log(colors.red(`  ✗ Failed: ${failureCount}`));
    }
    console.log(colors.cyan("=".repeat(60)));

    if (failureCount > 0) {
      process.exit(1);
    }

    console.log(colors.green("\nGeneration complete! 🎉\n"));
  } catch (error) {
    context.error(`Generation failed: ${error.message}`);
    if (verbose) {
      context.error(error.stack);
    }
    process.exit(1);
  }
};

/**
 * ServiceGen CLI definition
 */
const ServiceGenCliDefinition: Reactory.IReactoryComponentDefinition<ReactoryCliApp> = {
  nameSpace: "core",
  name: "ServiceGen",
  version: "1.0.0",
  description: HelpText,
  component: ServiceGenCli as unknown as ReactoryCliApp,
  domain: Reactory.ComponentDomain.plugin,
  features: [
    {
      feature: "ServiceGen",
      featureType: Reactory.FeatureType.function,
      action: ["generate", "service-generate", "service-gen"],
      stem: "generate",
    },
  ],
  overwrite: false,
  roles: ["USER", "DEVELOPER", "ADMIN"],
  stem: "generate",
  tags: ["service", "cli", "generator", "codegen", "typescript"],
  toString(includeVersion) {
    return includeVersion
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : this.name;
  },
};

export default ServiceGenCliDefinition;
