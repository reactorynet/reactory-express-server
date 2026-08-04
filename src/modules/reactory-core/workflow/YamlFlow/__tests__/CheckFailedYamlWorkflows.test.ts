import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { YamlStepRegistry } from '../steps/registry/YamlStepRegistry';

jest.setTimeout(180000);

describe('Dogfooding CheckFailedYamlWorkflows', () => {
  it('should scan log files and extract failed workflow entries', async () => {
    const yamlPath = path.join(process.cwd(), 'src/modules/reactory-core/workflows/autoRepair/CheckFailedYamlWorkflows.yaml');
    expect(fs.existsSync(yamlPath)).toBe(true);

    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const definition: any = yaml.load(yamlContent);

    expect(definition.name).toBe('CheckFailedYamlWorkflows');
    expect(definition.nameSpace).toBe('reactory');

    const registry = new YamlStepRegistry();
    const logDir = path.join(process.env.REACTORY_DATA || '/Users/wweber/Source/reactory/reactory-data', 'logging');

    const context: any = {
      workflow: definition,
      inputs: { logDirectory: logDir },
      variables: {},
      outputs: {},
      logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
    };

    for (const stepDef of definition.steps) {
      if (stepDef.type === 'log') continue;

      if (stepDef.type === 'set_variable') {
        const sourceStepId = stepDef.config.sourcePath.split('.')[0];
        const sourceVal = context.outputs[sourceStepId]?.stdout;
        context.variables[stepDef.config.key] = sourceVal;
        continue;
      }

      if (stepDef.type === 'cli_command') {
        const stepInstance = registry.createStep({
          id: stepDef.id,
          type: stepDef.type,
          config: stepDef.config,
        });

        const resolvedConfig = JSON.parse(JSON.stringify(stepDef.config));
        if (resolvedConfig.args) {
          resolvedConfig.args = resolvedConfig.args.map((arg: string) => {
            return arg.replace(/\$\{input\.logDirectory\}/g, context.inputs.logDirectory)
                      .replace(/\$\{variables\.logPath\}/g, context.variables.logPath ? context.variables.logPath.trim() : '')
                      .replace(/\$\{variables\.logMatches\}/g, context.variables.logMatches || '');
          });
        }

        const result = await (stepInstance as any).executeStep({
          ...context,
          config: resolvedConfig
        });

        context.outputs[stepDef.id] = result.outputs;
      }
    }

    expect(context.variables.logPath).toBeDefined();
    expect(context.outputs.parseLogEntries).toBeDefined();

    const parseStdout = context.outputs.parseLogEntries.stdout;
    console.log('=== DOGFOODING PARSED LOG OUTPUT ===');
    console.log(parseStdout);

    const parsedJson = JSON.parse(parseStdout);
    expect(parsedJson).toHaveProperty('foundErrors');
    expect(parsedJson).toHaveProperty('errors');
    expect(Array.isArray(parsedJson.errors)).toBe(true);
  });
});
