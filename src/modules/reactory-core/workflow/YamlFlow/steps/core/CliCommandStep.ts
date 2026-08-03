/**
 * CliCommandStep - Execute command line operations
 * Supports shell commands with environment variables, working directory, and output capture
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Minimal shell-output publisher used to echo cli_command output to a
 * WorkflowDesigner console. Kept inline (rather than importing the reactor
 * module's ShellStreamPublisher) so the core workflow engine does not depend on
 * the reactory-reactor module. Resolves the streaming transport by service id
 * and emits `shell` StreamingEvents; a no-op when no context/transport exists.
 */
interface StepShellPublisher {
  active: boolean;
  start: (command: string, cwd?: string, pid?: number) => void;
  stdout: (chunk: string) => void;
  stderr: (chunk: string) => void;
  exit: (exitCode: number, timedOut?: boolean) => void;
}

/**
 * Configuration interface for CliCommandStep
 */
export interface CliCommandStepConfig {
  /** Command to execute */
  command: string;
  
  /** Command arguments (alternative to including them in command) */
  args?: string[];
  
  /** Working directory */
  cwd?: string;
  
  /** Environment variables to add/override */
  env?: Record<string, string>;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Shell to use (default: true uses system shell) */
  shell?: boolean | string;
  
  /** How to handle output */
  output?: {
    /** Capture stdout */
    captureStdout?: boolean;
    
    /** Capture stderr */
    captureStderr?: boolean;
    
    /** Log output in real-time */
    streamOutput?: boolean;
    
    /** Maximum output size to capture (bytes) */
    maxOutputSize?: number;
  };
  
  /** Expected exit codes (default: [0]) */
  expectedExitCodes?: number[];
  
  /** Whether to fail the workflow if command fails */
  failOnError?: boolean;
  
  /** Input to pipe to command stdin */
  stdin?: string;

  /**
   * Streaming channel id to publish live stdout/stderr onto as `shell` events
   * (consumed by the WorkflowDesigner terminal echo). Defaults to
   * `variables.__shellChannelId` then the workflow instanceId.
   */
  streamChannelId?: string;

  /** Whether step is enabled */
  enabled?: boolean;
}

/**
 * Step for executing command line operations
 */
export class CliCommandStep extends BaseYamlStep {
  public readonly stepType = 'cli_command';
  
  /**
   * Execute the CLI command step
   * @param context - Execution context
   * @returns Promise resolving to execution result
   */
  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as CliCommandStepConfig;
    
    // Resolve template variables
    const resolvedConfig = this.resolveConfigTemplates(config, context);
    
    const startTime = Date.now();
    
    try {
      context.logger.info(`Executing command: ${resolvedConfig.command}${resolvedConfig.args ? ' ' + resolvedConfig.args.join(' ') : ''}`);
      
      const result = await this.executeCommand(resolvedConfig, context);
      const duration = Date.now() - startTime;
      
      // Check exit code
      const expectedCodes = resolvedConfig.expectedExitCodes || [0];
      const success = expectedCodes.includes(result.exitCode);
      
      if (!success && resolvedConfig.failOnError !== false) {
        context.logger.error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
        
        return {
          success: false,
          error: `Command failed with exit code ${result.exitCode}`,
          outputs: {
            command: resolvedConfig.command,
            args: resolvedConfig.args,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr
          },
          metadata: {
            duration,
            exitCode: result.exitCode,
            outputSize: result.stdout.length + result.stderr.length,
            workingDirectory: resolvedConfig.cwd
          }
        };
      }
      
      context.logger.info(`Command completed with exit code ${result.exitCode} in ${duration}ms`);
      
      return {
        success: true,
        outputs: {
          command: resolvedConfig.command,
          args: resolvedConfig.args,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr
        },
        metadata: {
          duration,
          exitCode: result.exitCode,
          outputSize: result.stdout.length + result.stderr.length,
          workingDirectory: resolvedConfig.cwd,
          success: success
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      context.logger.error(`Command execution failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        outputs: {
          command: resolvedConfig.command,
          args: resolvedConfig.args
        },
        metadata: {
          duration,
          executionError: errorMessage
        }
      };
    }
  }
  
  /**
   * Execute the actual command
   * @param config - Resolved configuration
   * @param context - Execution context
   * @returns Execution result
   */
  /**
   * Build a shell-stream publisher for live output echo. Resolves the channel
   * from config → workflow variables → workflow instanceId, and uses a stable
   * per-step terminal id so the designer renders one terminal pane per step.
   * Returns a no-op publisher when no Reactory context / transport is available.
   */
  private resolvePublisher(config: CliCommandStepConfig, context: StepExecutionContext): StepShellPublisher {
    const channelId =
      config.streamChannelId ||
      (context.variables && (context.variables.__shellChannelId as string)) ||
      context.workflow?.instanceId ||
      '';
    const shellSessionId = `${context.workflow?.instanceId || 'wf'}:${(this as any).id || context.workflow?.name || 'cli'}`;

    let tm: any;
    try {
      tm = context.reactoryContext?.getService?.('reactor.StreamingTransportManager@1.0.0');
    } catch {
      tm = undefined;
    }

    const isActive = (): boolean =>
      !!tm && !!channelId && typeof tm.hasActiveTransportForChat === 'function' && tm.hasActiveTransportForChat(channelId);

    const emit = (data: Record<string, any>): void => {
      if (!isActive()) return;
      const event = {
        type: 'shell',
        timestamp: new Date(),
        sessionId: channelId,
        conversationId: channelId,
        messageId: '',
        data: { shellSessionId, source: 'workflow', ...data },
      };
      try { void tm.sendEventToSession(channelId, event); } catch { /* best-effort */ }
    };

    return {
      active: isActive(),
      start: (command, cwd, pid) => emit({ phase: 'start', command, cwd, pid }),
      stdout: (chunk) => { if (chunk) emit({ phase: 'stdout', chunk }); },
      stderr: (chunk) => { if (chunk) emit({ phase: 'stderr', chunk }); },
      exit: (exitCode, timedOut = false) => emit({ phase: 'exit', exitCode, timedOut }),
    };
  }

  private async executeCommand(
    config: CliCommandStepConfig,
    context: StepExecutionContext
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {

    // Prepare environment
    const env = {
      ...process.env,
      ...config.env
    };
    
    // Prepare options
    const options: any = {
      cwd: config.cwd,
      env,
      shell: config.shell !== false,
      timeout: config.timeout
    };
    
    if (config.shell === true || config.shell === undefined) {
      options.shell = true;
    } else if (typeof config.shell === 'string') {
      options.shell = config.shell;
    }
    
    // Build full command
    let fullCommand = config.command;
    if (config.args && config.args.length > 0) {
      fullCommand += ' ' + config.args.map(arg => this.escapeShellArg(arg)).join(' ');
    }
    
    // Configure output capture
    const captureStdout = config.output?.captureStdout !== false; // Default true
    const captureStderr = config.output?.captureStderr !== false; // Default true
    const streamOutput = config.output?.streamOutput || false;
    const maxOutputSize = config.output?.maxOutputSize || 1024 * 1024; // 1MB default

    // Live terminal echo to the WorkflowDesigner (no-op when nobody is watching).
    const publisher = this.resolvePublisher(config, context);
    const shellStreaming = publisher.active;

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let outputSize = 0;

      // Use exec for simple commands, spawn for more control / live streaming.
      // Force the spawn path when a client is watching so we can stream chunks.
      if (!streamOutput && !config.stdin && !shellStreaming) {
        // Simple execution with exec
        execAsync(fullCommand, options)
          .then(({ stdout: out, stderr: err }) => {
            resolve({
              exitCode: 0,
              stdout: captureStdout ? out : '',
              stderr: captureStderr ? err : ''
            });
          })
          .catch((error: any) => {
            resolve({
              exitCode: error.code || 1,
              stdout: captureStdout ? (error.stdout || '') : '',
              stderr: captureStderr ? (error.stderr || error.message) : ''
            });
          });
      } else {
        // Use spawn for streaming or stdin
        const child = spawn(fullCommand, [], {
          ...options,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        publisher.start(fullCommand, config.cwd, child.pid);

        // Handle stdout
        if (child.stdout) {
          child.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString();

            if (streamOutput) {
              context.logger.info(`[STDOUT] ${chunk.trim()}`);
            }
            publisher.stdout(chunk);

            if (captureStdout) {
              outputSize += chunk.length;
              if (outputSize <= maxOutputSize) {
                stdout += chunk;
              } else if (stdout.length === 0) {
                stdout = '... output truncated ...';
              }
            }
          });
        }
        
        // Handle stderr
        if (child.stderr) {
          child.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString();
            
            if (streamOutput) {
              context.logger.warn(`[STDERR] ${chunk.trim()}`);
            }
            publisher.stderr(chunk);

            if (captureStderr) {
              outputSize += chunk.length;
              if (outputSize <= maxOutputSize) {
                stderr += chunk;
              } else if (stderr.length === 0) {
                stderr = '... output truncated ...';
              }
            }
          });
        }
        
        // Handle stdin
        if (config.stdin && child.stdin) {
          child.stdin.write(config.stdin);
          child.stdin.end();
        }
        
        // Handle process completion
        child.on('close', (code: number | null) => {
          publisher.exit(code || 0);
          resolve({
            exitCode: code || 0,
            stdout,
            stderr
          });
        });

        child.on('error', (error: Error) => {
          publisher.exit(1);
          reject(error);
        });

        // Handle timeout
        if (config.timeout) {
          setTimeout(() => {
            child.kill('SIGTERM');
            publisher.exit(124, true);
            reject(new Error(`Command timed out after ${config.timeout}ms`));
          }, config.timeout);
        }
      }
    });
  }
  
  /**
   * Escape shell argument to prevent injection
   * @param arg - Argument to escape
   * @returns Escaped argument
   */
  private escapeShellArg(arg: string): string {
    // Basic shell escaping - wrap in single quotes and escape any single quotes
    return `'${arg.replace(/'/g, "'\"'\"'")}'`;
  }
  
  /**
   * Resolve template variables in configuration
   * @param config - Configuration to resolve
   * @param context - Execution context
   * @returns Resolved configuration
   */
  private resolveConfigTemplates(config: CliCommandStepConfig, context: StepExecutionContext): CliCommandStepConfig {
    const resolved: CliCommandStepConfig = { ...config };
    
    // Resolve command
    resolved.command = this.resolveTemplate(config.command, context);
    
    // Resolve arguments
    if (config.args) {
      resolved.args = config.args.map(arg => this.resolveTemplate(arg, context));
    }
    
    // Resolve working directory
    if (config.cwd) {
      resolved.cwd = this.resolveTemplate(config.cwd, context);
    }
    
    // Resolve environment variables
    if (config.env) {
      resolved.env = {};
      for (const [key, value] of Object.entries(config.env)) {
        const valueResolved = this.resolveTemplate(value, context);
        if (valueResolved !== undefined) {
          if (Object.keys(valueResolved).length === 0 && typeof valueResolved === 'object') {
            // If resolved value is an empty object, skip setting it
            continue;
          }
          if (typeof valueResolved === 'object' || Array.isArray(valueResolved)) {
            // If resolved value is an object, convert to JSON string
            resolved.env[key] = JSON.stringify(valueResolved);
          } else {
            resolved.env[key] = valueResolved;
          }
        }
      }
    }
    
    // Resolve stdin
    if (config.stdin) {
      resolved.stdin = this.resolveTemplate(config.stdin, context);
    }
    
    return resolved;
  }
  
  /**
   * Validate the step configuration
   * @param config - Configuration to validate
   * @returns Validation result
   */
  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!config.command || typeof config.command !== 'string') {
      errors.push('command is required and must be a string');
    } else {
      // Check for potentially dangerous commands
      const dangerousPatterns = [
        /rm\s+-rf\s+\//, // rm -rf /
        />\s*\/dev\/sd/, // writing to disk devices
        /mkfs/, // format filesystem
        /dd\s+if=/, // disk dump
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(config.command))) {
        warnings.push('command contains potentially dangerous operations');
      }
    }
    
    // Arguments validation
    if (config.args && !Array.isArray(config.args)) {
      errors.push('args must be an array');
    }
    
    // Working directory validation
    if (config.cwd && typeof config.cwd !== 'string') {
      errors.push('cwd must be a string');
    }
    
    // Environment validation
    if (config.env && typeof config.env !== 'object') {
      errors.push('env must be an object');
    }
    
    // Timeout validation
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      errors.push('timeout must be a positive number');
    }
    
    // Shell validation
    if (config.shell !== undefined && typeof config.shell !== 'boolean' && typeof config.shell !== 'string') {
      errors.push('shell must be a boolean or string');
    }
    
    // Output configuration validation
    if (config.output) {
      if (typeof config.output !== 'object') {
        errors.push('output must be an object');
      } else {
        if (config.output.maxOutputSize && (typeof config.output.maxOutputSize !== 'number' || config.output.maxOutputSize <= 0)) {
          errors.push('output.maxOutputSize must be a positive number');
        }
      }
    }
    
    // Expected exit codes validation
    if (config.expectedExitCodes && !Array.isArray(config.expectedExitCodes)) {
      errors.push('expectedExitCodes must be an array');
    }
    
    // Stdin validation
    if (config.stdin && typeof config.stdin !== 'string') {
      errors.push('stdin must be a string');
    }
    
    // Warnings
    if (config.timeout && config.timeout > 300000) { // 5 minutes
      warnings.push('timeout is very long (>5 minutes), this may cause workflow delays');
    }
    
    if (config.command && config.command.includes('sudo')) {
      warnings.push('command uses sudo, ensure proper permissions are configured');
    }
    
    if (config.output?.maxOutputSize && config.output.maxOutputSize > 10 * 1024 * 1024) { // 10MB
      warnings.push('maxOutputSize is very large (>10MB), this may consume significant memory');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
