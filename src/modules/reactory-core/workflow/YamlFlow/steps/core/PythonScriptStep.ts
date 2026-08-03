/**
 * PythonScriptStep - Executes inline Python scripts or external Python files
 * Supports passing inputs via temporary JSON files and environment variables,
 * and captures outputs written to a designated output JSON file to prevent
 * stdout pollution/corruption from print statements or library logs.
 *
 * Config shape (from YAML `inputs` JSON):
 *   script:       "print('Hello World')"   (optional — inline python script)
 *   scriptPath:   "/path/to/script.py"     (optional — path to external python file)
 *   pythonPath:   "python3"                (optional — defaults to python3 or python)
 *   env:          { MY_ENV_VAR: "value" }  (optional — environment variables)
 *   timeout:      30000                    (optional — execution timeout in ms)
 *   failOnError:  true                     (optional — fail step if python exits non-zero)
 *
 * Environment variables injected into Python:
 *   REACTORY_INPUT_FILE:  Path to a JSON file containing the resolved step inputs.
 *   REACTORY_OUTPUT_FILE: Path where Python script should write its JSON outputs.
 *
 * Output: The parsed JSON object written by the Python script to REACTORY_OUTPUT_FILE.
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import {
  StepExecutionContext,
  StepExecutionResult,
  ValidationResult,
} from '../interfaces/IYamlStep';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration interface for PythonScriptStep
 */
export interface PythonScriptStepConfig {
  /** Inline Python script code */
  script?: string;

  /** Path to an external Python file */
  scriptPath?: string;

  /** Custom path to Python executable (default: 'python3' or 'python') */
  pythonPath?: string;

  /** Extra environment variables to pass to Python */
  env?: Record<string, string>;

  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;

  /** Whether to fail the step if process returns non-zero */
  failOnError?: boolean;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for executing Python scripts with robust ETL data integration
 */
export class PythonScriptStep extends BaseYamlStep {
  public readonly stepType = 'python_script';

  /**
   * Execute the Python script step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as PythonScriptStepConfig;

    const resolvedScript = config.script ? this.resolveTemplate(config.script, context) : undefined;
    const resolvedScriptPath = config.scriptPath ? this.resolveTemplate(config.scriptPath, context) : undefined;
    const pythonExecutable = config.pythonPath ? this.resolveTemplate(config.pythonPath, context) : 'python3';
    const timeout = config.timeout || 60000;

    if (!resolvedScript && !resolvedScriptPath) {
      return {
        success: false,
        error: 'Either "script" (inline) or "scriptPath" must be provided',
        outputs: {},
        metadata: {},
      };
    }

    const tempFiles: string[] = [];
    const startTime = Date.now();

    try {
      // 1. Determine the script file to run
      let scriptFileToRun = resolvedScriptPath;

      if (resolvedScript) {
        // Create a temp file for the inline script
        const tempScriptPath = path.join(
          os.tmpdir(),
          `reactory_script_${context.workflow.instanceId}_${Date.now()}.py`
        );
        fs.writeFileSync(tempScriptPath, resolvedScript, 'utf8');
        tempFiles.push(tempScriptPath);
        scriptFileToRun = tempScriptPath;
      }

      // 2. Write inputs to a temp JSON file
      const tempInputsPath = path.join(
        os.tmpdir(),
        `reactory_inputs_${context.workflow.instanceId}_${Date.now()}.json`
      );
      // Resolve inputs (substitute template variables in inputs object)
      const resolvedInputs = this.resolveParams(this.inputs, context);
      fs.writeFileSync(tempInputsPath, JSON.stringify(resolvedInputs, null, 2), 'utf8');
      tempFiles.push(tempInputsPath);

      // 3. Create a temp file for Python to write its JSON outputs
      const tempOutputsPath = path.join(
        os.tmpdir(),
        `reactory_outputs_${context.workflow.instanceId}_${Date.now()}.json`
      );
      // Pre-create output file with an empty JSON object
      fs.writeFileSync(tempOutputsPath, '{}', 'utf8');
      tempFiles.push(tempOutputsPath);

      context.logger.info(`Running Python script: ${scriptFileToRun} using ${pythonExecutable}`);

      // 4. Build the execution environment
      const env = {
        ...process.env,
        ...config.env,
        REACTORY_INPUT_FILE: tempInputsPath,
        REACTORY_OUTPUT_FILE: tempOutputsPath,
      };

      // 5. Spawn the Python process
      const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
        (resolve, reject) => {
          let stdout = '';
          let stderr = '';

          const child = spawn(pythonExecutable, [scriptFileToRun!], {
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          if (child.stdout) {
            child.stdout.on('data', (data) => {
              stdout += data.toString();
            });
          }

          if (child.stderr) {
            child.stderr.on('data', (data) => {
              stderr += data.toString();
            });
          }

          child.on('close', (code) => {
            resolve({
              exitCode: code || 0,
              stdout,
              stderr,
            });
          });

          child.on('error', (err) => {
            reject(err);
          });

          // Handle timeout
          setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error(`Python execution timed out after ${timeout}ms`));
          }, timeout);
        }
      );

      const duration = Date.now() - startTime;

      // Log stdout/stderr for transparency
      if (result.stdout.trim()) {
        context.logger.info(`[Python STDOUT]:\n${result.stdout}`);
      }
      if (result.stderr.trim()) {
        context.logger.warn(`[Python STDERR]:\n${result.stderr}`);
      }

      // 6. Check exit code
      if (result.exitCode !== 0 && config.failOnError !== false) {
        return {
          success: false,
          error: `Python exited with code ${result.exitCode}. Stderr: ${result.stderr}`,
          outputs: {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
          metadata: { duration, exitCode: result.exitCode },
        };
      }

      // 7. Read the JSON output file written by the Python script
      let outputs: Record<string, any> = {};
      if (fs.existsSync(tempOutputsPath)) {
        try {
          const content = fs.readFileSync(tempOutputsPath, 'utf8');
          outputs = JSON.parse(content);
        } catch (parseErr) {
          context.logger.error(`Failed to parse Python JSON output: ${parseErr}`);
          outputs = {
            _parseError: 'Failed to parse JSON output file written by Python script',
            _rawContent: fs.readFileSync(tempOutputsPath, 'utf8'),
          };
        }
      }

      return {
        success: true,
        outputs,
        metadata: {
          duration,
          exitCode: result.exitCode,
          scriptFile: scriptFileToRun,
        },
      };

    } catch (err) {
      const duration = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`Python script execution failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: {},
        metadata: { duration },
      };
    } finally {
      // 8. Clean up all temporary files
      for (const tempFile of tempFiles) {
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch (cleanupErr) {
          context.logger.warn(`Failed to clean up temporary file ${tempFile}: ${cleanupErr}`);
        }
      }
    }
  }

  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.script && !config.scriptPath) {
      errors.push('Either "script" or "scriptPath" is required');
    }

    if (config.script && typeof config.script !== 'string') {
      errors.push('script must be a string');
    }

    if (config.scriptPath && typeof config.scriptPath !== 'string') {
      errors.push('scriptPath must be a string');
    }

    if (config.pythonPath && typeof config.pythonPath !== 'string') {
      errors.push('pythonPath must be a string');
    }

    if (config.env && typeof config.env !== 'object') {
      errors.push('env must be an object');
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      errors.push('timeout must be a positive number');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Deep-resolve template strings inside a params object
   * @param params - Parameters to resolve
   * @param context - Execution context
   * @returns Resolved parameters
   */
  private resolveParams(params: any, context: StepExecutionContext): any {
    if (typeof params === 'string') {
      return this.resolveTemplate(params, context);
    }
    if (Array.isArray(params)) {
      return params.map((p) => this.resolveParams(p, context));
    }
    if (params && typeof params === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        resolved[key] = this.resolveParams(value, context);
      }
      return resolved;
    }
    return params;
  }
}
