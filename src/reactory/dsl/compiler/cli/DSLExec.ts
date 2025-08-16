import readline, { ReadLine } from 'readline';
import fs from 'fs';
import path from 'path';
import logger from "@reactory/server-core/logging";
import { execute, createContext } from '../engine';
import DSLExecutionContext from '../engine/ExecutionContext';

/**
 * DSL CLI Executor with full functionality
 * Supports interactive REPL mode, script file execution, error reporting, debugging, and command history
 */
class DSLExec {
  private rl: ReadLine;
  private context: DSLExecutionContext;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  private isDebugMode: boolean = false;
  private isVerboseMode: boolean = false;
  private maxHistorySize: number = 100;

  constructor(private reactoryContext: Reactory.Server.IReactoryContext) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'DSL> ',
      terminal: true,
      historySize: this.maxHistorySize
    });
  }

  /**
   * Initialize the CLI
   */
  async initialize(): Promise<void> {
    try {
      this.context = await createContext(this.reactoryContext, 'cli');
      this.setupEventListeners();
      this.displayWelcome();
      this.rl.prompt();
    } catch (error) {
      logger.error('Failed to initialize DSL CLI:', error);
      process.exit(1);
    }
  }

  /**
   * Setup event listeners for the CLI
   */
  private setupEventListeners(): void {
    // Handle line input
    this.rl.on('line', async (input: string) => {
      try {
        await this.processInput(input.trim());
      } catch (error) {
        this.handleError(error);
      } finally {
        this.rl.prompt();
      }
    });

    // Handle close event
    this.rl.on('close', () => {
      this.displayGoodbye();
      process.exit(0);
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.handleInterrupt();
    });

    // Handle paste events
    process.stdin.on('paste', async () => {
      const pastedContent = process.stdin.read()?.toString() || '';
      if (pastedContent.trim()) {
        await this.processInput(pastedContent.trim());
      }
    });
  }

  /**
   * Process user input
   */
  private async processInput(input: string): Promise<void> {
    if (!input) return;

    // Add to history
    this.addToHistory(input);

    // Handle special commands
    if (input.startsWith('.')) {
      await this.handleSpecialCommand(input);
      return;
    }

    // Execute DSL code
    await this.executeDSL(input);
  }

  /**
   * Handle special CLI commands
   */
  private async handleSpecialCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.slice(1).split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        this.displayHelp();
        break;
      case 'debug':
        this.toggleDebugMode();
        break;
      case 'verbose':
        this.toggleVerboseMode();
        break;
      case 'history':
        this.displayHistory();
        break;
      case 'clear':
        this.clearHistory();
        break;
      case 'load':
        await this.loadScript(args[0]);
        break;
      case 'save':
        await this.saveScript(args[0], args.slice(1).join(' '));
        break;
      case 'vars':
        this.displayVariables();
        break;
      case 'output':
        this.displayOutput();
        break;
      case 'reset':
        await this.resetContext();
        break;
      case 'quit':
      case 'exit':
        this.rl.close();
        break;
      default:
        console.log(`Unknown command: ${cmd}. Type .help for available commands.`);
    }
  }

  /**
   * Execute DSL code
   */
  private async executeDSL(code: string): Promise<void> {
    try {
      if (this.isVerboseMode) {
        console.log(`Executing: ${code}`);
      }

      const startTime = Date.now();
      const result = await execute(code, this.context);
      const endTime = Date.now();

      if (this.isDebugMode) {
        console.log(`Execution time: ${endTime - startTime}ms`);
        console.log(`Result:`, result);
      } else if (result !== undefined) {
        console.log(`Result: ${result}`);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle errors with detailed reporting
   */
  private handleError(error: any): void {
    console.error('\n❌ Error:');
    
    if (this.isDebugMode) {
      console.error('Full error details:');
      console.error(error);
    } else {
      console.error(`Message: ${error.message || 'Unknown error'}`);
      if (error.stack) {
        const stackLines = error.stack.split('\n').slice(1, 4);
        console.error('Stack trace:');
        stackLines.forEach(line => console.error(`  ${line.trim()}`));
      }
    }
  }

  /**
   * Handle interrupt (Ctrl+C)
   */
  private handleInterrupt(): void {
    console.log('\n\nUse .exit or .quit to exit the DSL CLI');
    this.rl.prompt();
  }

  /**
   * Add command to history
   */
  private addToHistory(command: string): void {
    if (command && !command.startsWith('.')) {
      this.commandHistory.push(command);
      if (this.commandHistory.length > this.maxHistorySize) {
        this.commandHistory.shift();
      }
    }
  }

  /**
   * Display command history
   */
  private displayHistory(): void {
    if (this.commandHistory.length === 0) {
      console.log('No command history');
      return;
    }

    console.log('\nCommand History:');
    this.commandHistory.forEach((cmd, index) => {
      console.log(`${index + 1}: ${cmd}`);
    });
  }

  /**
   * Clear command history
   */
  private clearHistory(): void {
    this.commandHistory = [];
    console.log('Command history cleared');
  }

  /**
   * Toggle debug mode
   */
  private toggleDebugMode(): void {
    this.isDebugMode = !this.isDebugMode;
    console.log(`Debug mode: ${this.isDebugMode ? 'ON' : 'OFF'}`);
  }

  /**
   * Toggle verbose mode
   */
  private toggleVerboseMode(): void {
    this.isVerboseMode = !this.isVerboseMode;
    console.log(`Verbose mode: ${this.isVerboseMode ? 'ON' : 'OFF'}`);
  }

  /**
   * Load and execute a script file
   */
  private async loadScript(filename: string): Promise<void> {
    if (!filename) {
      console.log('Usage: .load <filename>');
      return;
    }

    try {
      const filePath = path.resolve(filename);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`Loading script: ${filePath}`);
      console.log('Script content:');
      console.log('─'.repeat(50));
      console.log(content);
      console.log('─'.repeat(50));
      
      await this.executeDSL(content);
    } catch (error) {
      console.error(`Failed to load script: ${error.message}`);
    }
  }

  /**
   * Save a script to file
   */
  private async saveScript(filename: string, content: string): Promise<void> {
    if (!filename || !content) {
      console.log('Usage: .save <filename> <content>');
      return;
    }

    try {
      const filePath = path.resolve(filename);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Script saved to: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save script: ${error.message}`);
    }
  }

  /**
   * Display current variables
   */
  private displayVariables(): void {
    const variables = this.context.getVariables();
    if (Object.keys(variables).length === 0) {
      console.log('No variables defined');
      return;
    }

    console.log('\nCurrent Variables:');
    Object.entries(variables).forEach(([key, value]) => {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    });
  }

  /**
   * Display output variables
   */
  private displayOutput(): void {
    const output = this.context.getOutput('$out');
    const condition = this.context.getOutput('$condition');
    const history = this.context.getOutputHistory();

    console.log('\nOutput Variables:');
    console.log(`  $out: ${JSON.stringify(output)}`);
    console.log(`  $condition: ${JSON.stringify(condition)}`);
    
    if (history.length > 0) {
      console.log('\nOutput History:');
      history.slice(-5).forEach((entry, index) => {
        console.log(`  ${history.length - 4 + index}: ${entry.key} = ${JSON.stringify(entry.value)}`);
      });
    }
  }

  /**
   * Reset execution context
   */
  private async resetContext(): Promise<void> {
    this.context = await createContext(this.reactoryContext, 'cli');
    console.log('Context reset');
  }

  /**
   * Display help information
   */
  private displayHelp(): void {
    console.log('\nDSL CLI Commands:');
    console.log('  .help          - Show this help');
    console.log('  .debug         - Toggle debug mode');
    console.log('  .verbose       - Toggle verbose mode');
    console.log('  .history       - Show command history');
    console.log('  .clear         - Clear command history');
    console.log('  .load <file>   - Load and execute script file');
    console.log('  .save <file> <content> - Save content to file');
    console.log('  .vars          - Show current variables');
    console.log('  .output        - Show output variables');
    console.log('  .reset         - Reset execution context');
    console.log('  .quit/.exit    - Exit the CLI');
    console.log('\nDSL Features:');
    console.log('  @print("text") - Print text');
    console.log('  @var(name, value) - Define variable');
    console.log('  @if(condition, "yes", "no") - Conditional execution');
    console.log('  @while(condition, "loop") - While loop');
    console.log('  @for(i=0; i<5; i++, "loop") - For loop');
    console.log('  @try("operation", "error") - Try-catch');
    console.log('  @switch(value, "cases") - Switch statement');
    console.log('  -->            - Macro chaining');
    console.log('  -=>            - Macro branching');
    console.log('  `Hello ${name}` - String interpolation');
  }

  /**
   * Display welcome message
   */
  private displayWelcome(): void {
    console.log('\n🚀 Reactory DSL CLI');
    console.log('Type .help for available commands');
    console.log('Type .quit or .exit to exit\n');
  }

  /**
   * Display goodbye message
   */
  private displayGoodbye(): void {
    console.log('\n👋 Have a great day!');
  }
}

/**
 * Main CLI execution function
 * @param kwargs Command line arguments
 * @param context Reactory context
 */
const DSLExecFunction = async (kwargs: string[], context: Reactory.Server.IReactoryContext): Promise<void> => {
  const cli = new DSLExec(context);
  await cli.initialize();
};

export default DSLExecFunction;