# TemplateService Enhancement Plan for Code Generation

## Executive Summary

The current `ReactoryTemplateService` is primarily designed for email and content template management with database persistence. For the service generator CLI to work effectively, we need to enhance the TemplateService to support **file-based code generation templates** without the email-specific overhead.

## Current State Analysis

### Existing Implementation

**Location**: `/src/modules/reactory-core/services/TemplateService.ts`

**Current Capabilities**:
- ✅ EJS template rendering via `renderTemplate()` method
- ✅ Database-backed template storage and retrieval
- ✅ Multi-tenant template support (client, organization, business unit, user levels)
- ✅ Email-specific template handling (subject, body, signature extraction)
- ✅ File reference support via `$ref://` syntax
- ✅ HTML entity decoding for EJS tags

**Current Limitations for Code Generation**:
- ❌ No direct file-based template loading (only via `$ref://` in database records)
- ❌ No template caching mechanism exposed
- ❌ No async rendering support (hardcoded `async: false`)
- ❌ No helper function registration system
- ❌ No template partial/include support
- ❌ No compiled template reuse
- ❌ Tightly coupled to email template structure
- ❌ No support for multiple template directories
- ❌ No template metadata (description, parameters, examples)

### Interface Compliance

Current interface: `IReactoryTemplateService extends ITemplateService, ITemplateRenderingService, IEmailTemplateService`

The service implements:
```typescript
interface ITemplateRenderingService {
  renderTemplate(template: Models.ITemplate | string, properties: unknown): string;
}
```

**Issue**: This only supports synchronous rendering and limited options.

## Required Enhancements

### 1. Add File-Based Template Loading

**New Methods**:

```typescript
/**
 * Load and render a template directly from filesystem
 * @param templatePath - Absolute or relative path to .ejs template file
 * @param data - Data object to pass to template
 * @param options - Rendering options
 */
async renderFile(
  templatePath: string,
  data: any,
  options?: TemplateRenderOptions
): Promise<string>;

/**
 * Render template from string content
 * @param templateString - EJS template string
 * @param data - Data object to pass to template
 * @param options - Rendering options
 */
async renderString(
  templateString: string,
  data: any,
  options?: TemplateRenderOptions
): Promise<string>;
```

### 2. Add Template Caching

**New Methods**:

```typescript
/**
 * Pre-compile a template for reuse
 * @param templatePath - Path to template file
 * @param cacheKey - Optional custom cache key
 */
async compileTemplate(
  templatePath: string,
  cacheKey?: string
): Promise<CompiledTemplate>;

/**
 * Clear template cache
 * @param cacheKey - Optional specific cache key to clear
 */
clearCache(cacheKey?: string): void;

/**
 * Get cache statistics
 */
getCacheStats(): TemplateCacheStats;
```

**Internal Implementation**:

```typescript
private templateCache: Map<string, {
  compiled: ejs.TemplateFunction;
  mtime: number;  // File modification time for invalidation
  path: string;
  hits: number;
}> = new Map();
```

### 3. Add Helper Function Registry

**New Methods**:

```typescript
/**
 * Register a helper function available in all templates
 * @param name - Helper function name
 * @param fn - Helper function implementation
 */
registerHelper(name: string, fn: (...args: any[]) => any): void;

/**
 * Register multiple helper functions
 * @param helpers - Object with helper name/function pairs
 */
registerHelpers(helpers: Record<string, (...args: any[]) => any>): void;

/**
 * Get all registered helpers
 */
getHelpers(): Record<string, Function>;

/**
 * Unregister a helper function
 */
unregisterHelper(name: string): void;
```

### 4. Add Template Directory Management

**New Methods**:

```typescript
/**
 * Add a template search directory
 * @param directory - Absolute path to template directory
 * @param priority - Priority for resolution order (higher = checked first)
 */
addTemplateDirectory(directory: string, priority?: number): void;

/**
 * Remove a template directory
 */
removeTemplateDirectory(directory: string): void;

/**
 * Get all registered template directories
 */
getTemplateDirectories(): Array<{ path: string; priority: number }>;

/**
 * Resolve template path from registered directories
 * @param templateName - Template filename or relative path
 */
resolveTemplatePath(templateName: string): string | null;
```

### 5. Enhanced Rendering Options

**New Interface**:

```typescript
interface TemplateRenderOptions {
  // EJS options
  cache?: boolean;              // Enable template caching (default: true)
  async?: boolean;              // Enable async rendering (default: true)
  filename?: string;            // Template filename for error reporting
  
  // Reactory-specific options
  helpers?: Record<string, Function>;  // Additional helpers for this render
  strict?: boolean;             // Throw on undefined variables
  encoding?: string;            // File encoding (default: 'utf8')
  timeout?: number;             // Rendering timeout in ms
  
  // Template resolution
  resolveIncludes?: boolean;    // Auto-resolve includes from template directories
  includeBasePath?: string;     // Base path for include resolution
}

interface CompiledTemplate {
  (data: any): Promise<string>;
  source: string;               // Template source code
  path: string;                 // Template file path
  dependencies: string[];       // List of included/required templates
}

interface TemplateCacheStats {
  size: number;                 // Number of cached templates
  hits: number;                 // Total cache hits
  misses: number;               // Total cache misses
  hitRate: number;              // Hit rate percentage
  entries: Array<{
    key: string;
    hits: number;
    size: number;
    mtime: Date;
  }>;
}
```

### 6. Add Async Support

**Update Existing Method**:

```typescript
// Current (synchronous)
renderTemplate(template: Models.ITemplate | string, properties: unknown): string;

// Enhanced (with async option)
renderTemplate(
  template: Models.ITemplate | string,
  properties: unknown,
  options?: TemplateRenderOptions
): Promise<string> | string;
```

### 7. Add Template Validation

**New Methods**:

```typescript
/**
 * Validate template syntax without rendering
 * @param templatePath - Path to template or template string
 */
async validateTemplate(templatePath: string): Promise<TemplateValidationResult>;

/**
 * List all variables used in a template
 * @param templatePath - Path to template
 */
async getTemplateVariables(templatePath: string): Promise<string[]>;

interface TemplateValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    column: number;
    message: string;
  }>;
  warnings: Array<{
    line: number;
    column: number;
    message: string;
  }>;
}
```

## Implementation Plan

### Phase 1: Core File Operations (Priority: High)

**Files to Modify**:
- `src/modules/reactory-core/services/TemplateService.ts`
- `src/types/service/index.d.ts` (in reactory-core)

**Tasks**:
1. ✅ Add `renderFile()` method
2. ✅ Add `renderString()` method with async support
3. ✅ Update `renderTemplate()` to support async
4. ✅ Add basic template directory management
5. ✅ Add file system template resolution

**Estimated Effort**: 4-6 hours

### Phase 2: Caching & Performance (Priority: High)

**Tasks**:
1. ✅ Implement template cache with Map
2. ✅ Add `compileTemplate()` method
3. ✅ Add cache invalidation based on file mtime
4. ✅ Add `clearCache()` method
5. ✅ Add `getCacheStats()` method
6. ✅ Update `renderFile()` to use cache

**Estimated Effort**: 4-5 hours

### Phase 3: Helper System (Priority: Medium)

**Tasks**:
1. ✅ Create helper registry
2. ✅ Add `registerHelper()` / `registerHelpers()` methods
3. ✅ Inject helpers into EJS render context
4. ✅ Create default helper functions:
   - `pascalCase(str: string)`
   - `camelCase(str: string)`
   - `kebabCase(str: string)`
   - `snakeCase(str: string)`
   - `mapType(yamlType: string)`
   - `formatJSDoc(text: string, indent?: string)`
   - `timestamp(format?: string)`

**Estimated Effort**: 3-4 hours

### Phase 4: Validation & Metadata (Priority: Low)

**Tasks**:
1. ✅ Add `validateTemplate()` method
2. ✅ Add `getTemplateVariables()` method
3. ✅ Add error handling improvements
4. ✅ Add template dependency tracking

**Estimated Effort**: 3-4 hours

### Phase 5: Testing & Documentation (Priority: High)

**Tasks**:
1. ✅ Unit tests for all new methods
2. ✅ Integration tests with service generator
3. ✅ Performance benchmarks for caching
4. ✅ Update service documentation
5. ✅ Add usage examples
6. ✅ Update specification.md with actual API

**Estimated Effort**: 6-8 hours

## Backward Compatibility

All enhancements will maintain backward compatibility:

1. ✅ Existing `renderTemplate()` method will continue to work
2. ✅ Email template methods remain unchanged
3. ✅ Database-backed templates still supported
4. ✅ New methods are additive (no breaking changes)

## Example Enhanced Usage

### Basic File Rendering

```typescript
const templateService = context.getService<IReactoryTemplateService>(
  'core.TemplateService@1.0.0'
);

// Render from file
const output = await templateService.renderFile(
  './templates/service.rest.ts.ejs',
  {
    className: 'MyService',
    methods: [...],
    dependencies: [...]
  },
  {
    cache: true,
    async: true
  }
);
```

### Using Compiled Templates

```typescript
// Pre-compile for reuse
const template = await templateService.compileTemplate(
  './templates/service.rest.ts.ejs'
);

// Use multiple times (very fast)
const service1 = await template({ name: 'Service1', /* ... */ });
const service2 = await template({ name: 'Service2', /* ... */ });
const service3 = await template({ name: 'Service3', /* ... */ });
```

### With Custom Helpers

```typescript
// Register global helpers
templateService.registerHelpers({
  toPascalCase: (str: string) => {
    return str.replace(/(\w)(\w*)/g, (g0, g1, g2) => 
      g1.toUpperCase() + g2.toLowerCase()
    );
  },
  toTypeScript: (openApiType: string) => {
    const map = {
      'string': 'string',
      'integer': 'number',
      'boolean': 'boolean'
    };
    return map[openApiType] || 'any';
  }
});

// Use in template
// class <%= helpers.toPascalCase(name) %> { }
```

### Template Validation

```typescript
// Validate before rendering
const validation = await templateService.validateTemplate(
  './templates/service.rest.ts.ejs'
);

if (!validation.valid) {
  console.error('Template errors:', validation.errors);
}

// Get template variables
const variables = await templateService.getTemplateVariables(
  './templates/service.rest.ts.ejs'
);
console.log('Required variables:', variables);
```

## Recommended Default Helpers

```typescript
const defaultHelpers = {
  // String transformations
  pascalCase: (str: string) => str.replace(/(\w)(\w*)/g, 
    (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase()),
  
  camelCase: (str: string) => str.replace(/[-_](\w)/g, 
    (_, c) => c.toUpperCase()),
  
  kebabCase: (str: string) => str.replace(/([a-z])([A-Z])/g, 
    '$1-$2').toLowerCase(),
  
  snakeCase: (str: string) => str.replace(/([a-z])([A-Z])/g, 
    '$1_$2').toLowerCase(),
  
  upperCase: (str: string) => str.toUpperCase(),
  
  lowerCase: (str: string) => str.toLowerCase(),
  
  // Type mapping
  mapType: (yamlType: string) => {
    const typeMap = {
      'string': 'string',
      'number': 'number',
      'integer': 'number',
      'boolean': 'boolean',
      'array': 'any[]',
      'object': 'any'
    };
    return typeMap[yamlType] || 'any';
  },
  
  // Documentation
  formatJSDoc: (text: string, indent: string = '') => {
    const lines = text.split('\n');
    return lines.map(line => `${indent} * ${line}`).join('\n');
  },
  
  // Date/time
  timestamp: (format?: string) => {
    const now = new Date();
    return format ? 
      // Use custom format if provided
      format.replace('YYYY', now.getFullYear().toString())
            .replace('MM', (now.getMonth() + 1).toString().padStart(2, '0'))
            .replace('DD', now.getDate().toString().padStart(2, '0'))
      : now.toISOString();
  },
  
  // Code generation
  indent: (text: string, spaces: number) => {
    const indentation = ' '.repeat(spaces);
    return text.split('\n').map(line => indentation + line).join('\n');
  },
  
  comment: (text: string, style: 'js' | 'hash' | 'xml' = 'js') => {
    switch (style) {
      case 'js':
        return `// ${text}`;
      case 'hash':
        return `# ${text}`;
      case 'xml':
        return `<!-- ${text} -->`;
    }
  },
  
  // Array helpers
  join: (arr: any[], separator: string = ', ') => arr.join(separator),
  
  first: (arr: any[]) => arr[0],
  
  last: (arr: any[]) => arr[arr.length - 1],
  
  // Conditional
  ifDefined: (value: any, defaultValue: any = '') => 
    value !== undefined && value !== null ? value : defaultValue,
};
```

## Migration Strategy

### For Existing Code
No changes required. All existing functionality continues to work.

### For New Service Generator
Use the enhanced methods:

```typescript
const templateService = context.getService('core.TemplateService@1.0.0');

// Setup template directories
templateService.addTemplateDirectory(
  path.join(__dirname, 'templates'),
  100  // High priority
);

// Register helpers
templateService.registerHelpers(defaultHelpers);

// Render service
const output = await templateService.renderFile(
  'service.rest.ts.ejs',  // Will be resolved from registered directories
  serviceConfig,
  { cache: true, async: true }
);
```

## Testing Requirements

### Unit Tests

```typescript
describe('ReactoryTemplateService - Enhanced', () => {
  describe('renderFile', () => {
    it('should render template from file path');
    it('should cache compiled templates');
    it('should invalidate cache on file change');
    it('should handle template not found');
    it('should support async rendering');
  });
  
  describe('renderString', () => {
    it('should render template from string');
    it('should support async rendering');
    it('should inject helpers');
  });
  
  describe('compileTemplate', () => {
    it('should compile and cache template');
    it('should return reusable function');
    it('should track dependencies');
  });
  
  describe('helpers', () => {
    it('should register helper function');
    it('should register multiple helpers');
    it('should make helpers available in templates');
    it('should unregister helper');
  });
  
  describe('cache', () => {
    it('should cache templates');
    it('should return cache stats');
    it('should clear cache');
    it('should invalidate on file change');
  });
  
  describe('validation', () => {
    it('should validate template syntax');
    it('should extract template variables');
    it('should report syntax errors');
  });
});
```

### Integration Tests

```typescript
describe('TemplateService with ServiceGen', () => {
  it('should generate REST service from template');
  it('should generate gRPC service from template');
  it('should use helpers in template');
  it('should resolve template includes');
  it('should handle large templates efficiently');
});
```

### Performance Benchmarks

```typescript
describe('TemplateService Performance', () => {
  it('should cache improve rendering speed by >80%');
  it('should handle 100 concurrent renders');
  it('should compile template <10ms');
  it('should render cached template <1ms');
});
```

## Security Considerations

1. **Path Traversal Prevention**: Validate all template paths
2. **Sandbox Execution**: EJS templates execute in isolated context
3. **File Access Control**: Only allow reading from registered directories
4. **Input Validation**: Sanitize all data passed to templates
5. **Timeout Protection**: Add rendering timeout to prevent DoS
6. **Cache Size Limit**: Implement max cache size to prevent memory exhaustion

## Performance Targets

- Template compilation: < 10ms
- Cached template render: < 1ms
- Uncached template render: < 50ms
- Cache hit rate: > 90% in production
- Memory per cached template: < 100KB
- Max concurrent renders: > 100

## Documentation Updates

1. Update `TemplateService.ts` inline documentation
2. Update type definitions in `reactory-core`
3. Create usage examples in specification.md
4. Add migration guide for existing code
5. Document performance characteristics
6. Add troubleshooting guide

## Summary

The enhancements proposed will transform the TemplateService from an email-focused service to a general-purpose, high-performance code generation template engine while maintaining full backward compatibility. The phased approach allows for incremental delivery with the highest-priority features (file rendering and caching) delivered first.

**Total Estimated Effort**: 20-27 hours

**Recommended Timeline**: 
- Phase 1-2: Week 1 (Critical path for service generator)
- Phase 3: Week 2 (Nice to have, improves DX)
- Phase 4-5: Week 3 (Polish and documentation)

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-02-04  
**Author**: Reactory Development Team
