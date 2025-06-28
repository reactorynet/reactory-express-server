import Reactory from "@reactory/reactory-core";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { ReadLine } from "readline";
import colors from "colors/safe";

const HelpText = `
The csv2json CLI tool converts a CSV file to a JSON file using an optional mapping file.

Parameters:
  -s --source <csv-source-file>      Path to the CSV source file
  -o --output <json-output-file>     Path to the JSON output file
  -m --map <mapping-file>            Path to a mapping file (JSON or YAML) that defines the mapping object
  -h --help                         Show help
`;

/**
 * csv2json CLI tool for Reactory
 * @param kwargs
 * @param context
 */
const Csv2JsonCli = async (
  kwargs: string[],
  context: Reactory.Server.IReactoryContext
): Promise<void> => {
  if (!kwargs || kwargs.length === 0) {
    context.error("No arguments provided");
    process.exit(1);
  }

  const rl: ReadLine = context.readline as ReadLine;

  let source = "";
  let output = "";
  let mapFile = "";
  let help = false;

  for (const kwarg of kwargs) {
    let arg: string;
    let argv: string | boolean = null;
    if (kwarg.indexOf("=") === -1) {
      arg = kwarg;
      argv = true;
    } else {
      arg = kwarg.split("=")[0];
      argv = kwarg.split("=")[1];
    }

    switch (arg) {
      case "-s":
      case "--source":
        source = argv as string;
        break;
      case "-o":
      case "--output":
        output = argv as string;
        break;
      case "-m":
      case "--map":
        mapFile = argv as string;
        break;
      case "-h":
      case "--help":
        help = true;
        break;
      default:
        context.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
  }

  if (help) {
    rl.write(colors.green(HelpText));
    process.exit(0);
  }

  if (!source) {
    context.error("No CSV source file provided");
    process.exit(1);
  }

  // If no output file is specified, use <inputfilename>.json in the same folder
  if (!output) {
    const csvPath = path.resolve(source);
    const csvDir = path.dirname(csvPath);
    const csvBase = path.basename(csvPath, path.extname(csvPath));
    output = path.join(csvDir, `${csvBase}.json`);
  }

  // Load mapping file if provided, or check for default .map.json
  let mapping: Record<string, string> = null;
  if (!mapFile) {
    // Try to find a .map.json file in the same folder as the CSV
    const csvPath = path.resolve(source);
    const csvDir = path.dirname(csvPath);
    const csvBase = path.basename(csvPath, path.extname(csvPath));
    const defaultMapPath = path.join(csvDir, `${csvBase}.map.json`);
    if (fs.existsSync(defaultMapPath)) {
      mapFile = defaultMapPath;
    }
  }
  if (mapFile) {
    const mapPath = path.resolve(mapFile);
    if (!fs.existsSync(mapPath)) {
      context.error(`Mapping file not found: ${mapPath}`);
      process.exit(1);
    }
    const mapText = fs.readFileSync(mapPath, "utf8");
    if (mapFile.endsWith(".json")) {
      mapping = JSON.parse(mapText);
    } else if (mapFile.endsWith(".yaml") || mapFile.endsWith(".yml")) {
      mapping = yaml.load(mapText) as Record<string, string>;
    } else {
      context.error("Mapping file must be .json or .yaml");
      process.exit(1);
    }
  }

  // Read CSV file
  const csvPath = path.resolve(source);
  if (!fs.existsSync(csvPath)) {
    context.error(`CSV source file not found: ${csvPath}`);
    process.exit(1);
  }
  const csvText = fs.readFileSync(csvPath, "utf8");
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    context.error("CSV file is empty");
    process.exit(1);
  }
  const headers = lines[0].split(",");
  const data = lines.slice(1).map(line => {
    const values = line.split(",");
    let defaultShape: Record<string, any> = {};
    headers.forEach((header, idx) => {
      defaultShape[header.trim()] = null; // Initialize with null
      defaultShape[header.trim()] = values[idx] ? values[idx].trim() : null;      
    });
    if (!mapping) return defaultShape; // No mapping, return default shape
    return context.utils.objectMapper.merge(defaultShape, mapping);
  });

  // Write output as JSON or YAML depending on file extension
  const outputPath = path.resolve(output);
  let outputContent: string;
  if (outputPath.endsWith('.yaml') || outputPath.endsWith('.yml')) {
    outputContent = yaml.dump(data);
  } else {
    outputContent = JSON.stringify(data, null, 2);
  }
  fs.writeFileSync(outputPath, outputContent);
  rl.write(colors.green(`CSV converted and written to: ${outputPath}\n`));
};

const Csv2JsonCliDefinition: Reactory.IReactoryComponentDefinition<any> = {
  nameSpace: "core",
  name: "Csv2Json",
  version: "1.0.0",
  description: HelpText,
  component: Csv2JsonCli,
  domain: Reactory.ComponentDomain.plugin,
  features: [
    {
      feature: "Csv2Json",
      featureType: Reactory.FeatureType.function,
      action: ["convert", "csv2json"],
      stem: "convert",
    },
  ],
  overwrite: false,
  roles: ["USER"],
  stem: "convert",
  tags: ["csv", "json", "cli", "converter"],
  toString(includeVersion) {
    return includeVersion
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : this.name;
  },
};

export default Csv2JsonCliDefinition;

