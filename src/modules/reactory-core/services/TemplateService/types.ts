import ejs from 'ejs';

/**
 * Options for template rendering operations
 */
export interface TemplateRenderOptions {
  /** Enable template caching (default: true) */
  cache?: boolean;
  /** Enable async rendering (default: true) */
  async?: boolean;
  /** Template filename for error reporting and includes */
  filename?: string;
  /** Additional helpers for this render only */
  helpers?: Record<string, TemplateHelperFunction>;
  /** Throw on undefined variables (default: false) */
  strict?: boolean;
  /** File encoding (default: 'utf8') */
  encoding?: BufferEncoding;
  /** Rendering timeout in ms */
  timeout?: number;
  /** Auto-resolve includes from template directories */
  resolveIncludes?: boolean;
  /** Base path for include resolution */
  includeBasePath?: string;
  /** EJS delimiter (default: '%') */
  delimiter?: string;
  /** EJS open delimiter (default: '<') */
  openDelimiter?: string;
  /** EJS close delimiter (default: '>') */
  closeDelimiter?: string;
}

/**
 * A compiled template function that can be reused
 */
export interface CompiledTemplate {
  /** Render the template with data */
  (data: any): Promise<string>;
  /** Template source code */
  source: string;
  /** Template file path (if loaded from file) */
  path: string;
  /** Last modified time of the template file */
  mtime?: number;
  /** List of included template paths */
  dependencies: string[];
  /** The underlying EJS template function */
  templateFn: ejs.TemplateFunction;
}

/**
 * Cache entry for compiled templates
 */
export interface TemplateCacheEntry {
  /** Compiled template function */
  compiled: CompiledTemplate;
  /** File modification time for invalidation */
  mtime: number;
  /** Template file path */
  path: string;
  /** Number of cache hits */
  hits: number;
  /** Approximate size in bytes */
  size: number;
  /** When the entry was cached */
  cachedAt: Date;
}

/**
 * Statistics about the template cache
 */
export interface TemplateCacheStats {
  /** Number of cached templates */
  size: number;
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate percentage (0-100) */
  hitRate: number;
  /** Total memory used by cache (approximate) */
  memoryUsage: number;
  /** Individual cache entries */
  entries: Array<{
    key: string;
    hits: number;
    size: number;
    mtime: Date;
    cachedAt: Date;
  }>;
}

/**
 * Template helper function type
 */
export type TemplateHelperFunction = (...args: any[]) => any;

/**
 * Registry of template directories with priorities
 */
export interface TemplateDirectory {
  /** Absolute path to the directory */
  path: string;
  /** Priority for resolution (higher = checked first) */
  priority: number;
}

/**
 * Result of template validation
 */
export interface TemplateValidationResult {
  /** Whether the template is valid */
  valid: boolean;
  /** Syntax errors found */
  errors: TemplateError[];
  /** Warnings (non-fatal issues) */
  warnings: TemplateWarning[];
  /** Variables used in the template */
  variables: string[];
  /** Templates included by this template */
  includes: string[];
}

/**
 * Template syntax error
 */
export interface TemplateError {
  /** Line number where error occurred */
  line: number;
  /** Column number where error occurred */
  column: number;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code?: string;
}

/**
 * Template warning (non-fatal issue)
 */
export interface TemplateWarning {
  /** Line number where warning occurred */
  line: number;
  /** Column number where warning occurred */
  column: number;
  /** Warning message */
  message: string;
  /** Warning code for programmatic handling */
  code?: string;
}

/**
 * Default helper functions provided by the service
 */
export const DEFAULT_TEMPLATE_HELPERS: Record<string, TemplateHelperFunction> = {
  /**
   * Convert string to PascalCase
   * @example pascalCase('hello_world') => 'HelloWorld'
   */
  pascalCase: (str: string): string => {
    if (!str) return '';
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toUpperCase());
  },

  /**
   * Convert string to camelCase
   * @example camelCase('hello_world') => 'helloWorld'
   */
  camelCase: (str: string): string => {
    if (!str) return '';
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toLowerCase());
  },

  /**
   * Convert string to kebab-case
   * @example kebabCase('HelloWorld') => 'hello-world'
   */
  kebabCase: (str: string): string => {
    if (!str) return '';
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  },

  /**
   * Convert string to snake_case
   * @example snakeCase('HelloWorld') => 'hello_world'
   */
  snakeCase: (str: string): string => {
    if (!str) return '';
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  },

  /**
   * Convert string to UPPER_CASE
   * @example upperCase('helloWorld') => 'HELLO_WORLD'
   */
  upperSnakeCase: (str: string): string => {
    if (!str) return '';
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
  },

  /**
   * Map YAML/JSON Schema types to TypeScript types
   * @example mapType('integer') => 'number'
   */
  mapType: (yamlType: string): string => {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      integer: 'number',
      boolean: 'boolean',
      array: 'any[]',
      object: 'Record<string, any>',
      null: 'null',
      any: 'any',
    };
    return typeMap[yamlType?.toLowerCase()] || 'any';
  },

  /**
   * Format text as JSDoc comment
   * @example formatJSDoc('A description', '  ') => '  * A description'
   */
  formatJSDoc: (text: string, indent: string = ''): string => {
    if (!text) return '';
    const lines = text.split('\n');
    return lines.map((line) => `${indent} * ${line}`).join('\n');
  },

  /**
   * Get current timestamp in various formats
   * @example timestamp() => '2026-02-04T10:30:00.000Z'
   */
  timestamp: (format?: string): string => {
    const now = new Date();
    if (!format) return now.toISOString();

    return format
      .replace('YYYY', now.getFullYear().toString())
      .replace('MM', (now.getMonth() + 1).toString().padStart(2, '0'))
      .replace('DD', now.getDate().toString().padStart(2, '0'))
      .replace('HH', now.getHours().toString().padStart(2, '0'))
      .replace('mm', now.getMinutes().toString().padStart(2, '0'))
      .replace('ss', now.getSeconds().toString().padStart(2, '0'));
  },

  /**
   * Indent text by specified number of spaces
   * @example indent('hello\nworld', 2) => '  hello\n  world'
   */
  indent: (text: string, spaces: number = 2): string => {
    if (!text) return '';
    const indentation = ' '.repeat(spaces);
    return text
      .split('\n')
      .map((line) => indentation + line)
      .join('\n');
  },

  /**
   * Create a comment in various styles
   * @example comment('TODO: fix this', 'js') => '// TODO: fix this'
   */
  comment: (text: string, style: 'js' | 'hash' | 'xml' | 'block' = 'js'): string => {
    if (!text) return '';
    switch (style) {
      case 'js':
        return `// ${text}`;
      case 'hash':
        return `# ${text}`;
      case 'xml':
        return `<!-- ${text} -->`;
      case 'block':
        return `/* ${text} */`;
      default:
        return `// ${text}`;
    }
  },

  /**
   * Join array elements with separator
   * @example join(['a', 'b', 'c'], ', ') => 'a, b, c'
   */
  join: (arr: any[], separator: string = ', '): string => {
    if (!Array.isArray(arr)) return '';
    return arr.join(separator);
  },

  /**
   * Get first element of array
   */
  first: <T>(arr: T[]): T | undefined => {
    if (!Array.isArray(arr)) return undefined;
    return arr[0];
  },

  /**
   * Get last element of array
   */
  last: <T>(arr: T[]): T | undefined => {
    if (!Array.isArray(arr)) return undefined;
    return arr[arr.length - 1];
  },

  /**
   * Return value if defined, otherwise default
   * @example ifDefined(undefined, 'default') => 'default'
   */
  ifDefined: <T>(value: T | undefined | null, defaultValue: T): T => {
    return value !== undefined && value !== null ? value : defaultValue;
  },

  /**
   * Pluralize a word based on count
   * @example pluralize('item', 5) => 'items'
   */
  pluralize: (word: string, count: number, plural?: string): string => {
    if (count === 1) return word;
    return plural || `${word}s`;
  },

  /**
   * Quote a string for code output
   * @example quote('hello') => "'hello'"
   */
  quote: (str: string, style: 'single' | 'double' | 'backtick' = 'single'): string => {
    if (str === undefined || str === null) return "''";
    const escaped = str.replace(/\\/g, '\\\\');
    switch (style) {
      case 'single':
        return `'${escaped.replace(/'/g, "\\'")}'`;
      case 'double':
        return `"${escaped.replace(/"/g, '\\"')}"`;
      case 'backtick':
        return `\`${escaped.replace(/`/g, '\\`')}\``;
      default:
        return `'${escaped}'`;
    }
  },

  /**
   * Escape HTML entities
   */
  escapeHtml: (str: string): string => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Convert object to JSON string with optional formatting
   * @example json({a: 1}) => '{"a":1}'
   */
  json: (obj: any, indent?: number): string => {
    return JSON.stringify(obj, null, indent);
  },

  /**
   * Repeat a string n times
   * @example repeat('ab', 3) => 'ababab'
   */
  repeat: (str: string, count: number): string => {
    if (!str || count <= 0) return '';
    return str.repeat(count);
  },

  /**
   * Truncate string to max length with ellipsis
   * @example truncate('hello world', 8) => 'hello...'
   */
  truncate: (str: string, maxLength: number, suffix: string = '...'): string => {
    if (!str || str.length <= maxLength) return str || '';
    return str.substring(0, maxLength - suffix.length) + suffix;
  },
};

/**
 * Extended interface for TemplateService with code generation features
 */
export interface IEnhancedTemplateService extends Reactory.Service.IReactoryTemplateService {
  /**
   * Render a template from a file path
   */
  renderFile(templatePath: string, data: any, options?: TemplateRenderOptions): Promise<string>;

  /**
   * Render a template from a string with full async support
   */
  renderString(templateString: string, data: any, options?: TemplateRenderOptions): Promise<string>;

  /**
   * Pre-compile a template for efficient reuse
   */
  compileTemplate(templatePath: string, cacheKey?: string): Promise<CompiledTemplate>;

  /**
   * Clear the template cache
   */
  clearCache(cacheKey?: string): void;

  /**
   * Get template cache statistics
   */
  getCacheStats(): TemplateCacheStats;

  /**
   * Register a helper function
   */
  registerHelper(name: string, fn: TemplateHelperFunction): void;

  /**
   * Register multiple helper functions
   */
  registerHelpers(helpers: Record<string, TemplateHelperFunction>): void;

  /**
   * Get all registered helpers
   */
  getHelpers(): Record<string, TemplateHelperFunction>;

  /**
   * Unregister a helper function
   */
  unregisterHelper(name: string): void;

  /**
   * Add a template search directory
   */
  addTemplateDirectory(directory: string, priority?: number): void;

  /**
   * Remove a template search directory
   */
  removeTemplateDirectory(directory: string): void;

  /**
   * Get all registered template directories
   */
  getTemplateDirectories(): TemplateDirectory[];

  /**
   * Resolve a template path from registered directories
   */
  resolveTemplatePath(templateName: string): string | null;

  /**
   * Validate template syntax without rendering
   */
  validateTemplate(templatePathOrString: string, isFilePath?: boolean): Promise<TemplateValidationResult>;
}
