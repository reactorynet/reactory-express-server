export { default as DSLExec } from './DSLExec';

// CLI utilities
export const createCLI = (context: Reactory.Server.IReactoryContext) => {
  return import('./DSLExec').then(module => module.default);
};

// CLI configuration
export const CLI_CONFIG = {
  PROMPT: 'DSL> ',
  MAX_HISTORY_SIZE: 100,
  DEBUG_MODE: false,
  VERBOSE_MODE: false
};

// CLI commands
export const CLI_COMMANDS = {
  HELP: '.help',
  DEBUG: '.debug',
  VERBOSE: '.verbose',
  HISTORY: '.history',
  CLEAR: '.clear',
  LOAD: '.load',
  SAVE: '.save',
  VARS: '.vars',
  OUTPUT: '.output',
  RESET: '.reset',
  QUIT: '.quit',
  EXIT: '.exit'
};

// CLI help text
export const CLI_HELP_TEXT = `
DSL CLI Commands:
  .help          - Show this help
  .debug         - Toggle debug mode
  .verbose       - Toggle verbose mode
  .history       - Show command history
  .clear         - Clear command history
  .load <file>   - Load and execute script file
  .save <file> <content> - Save content to file
  .vars          - Show current variables
  .output        - Show output variables
  .reset         - Reset execution context
  .quit/.exit    - Exit the CLI

DSL Features:
  @print("text") - Print text
  @var(name, value) - Define variable
  @if(condition, "yes", "no") - Conditional execution
  @while(condition, "loop") - While loop
  @for(i=0; i<5; i++, "loop") - For loop
  @try("operation", "error") - Try-catch
  @switch(value, "cases") - Switch statement
  -->            - Macro chaining
  -=>            - Macro branching
  \`Hello \${name}\` - String interpolation
`;



