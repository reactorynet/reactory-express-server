# Reactory Template Service

> Enhanced EJS template rendering with caching, helpers, and code generation support

## Overview

The ReactoryTemplateService provides template rendering capabilities for the Reactory platform. It supports both database-backed templates for email/content management and file-based templates for code generation.

## Service ID

```
core.TemplateService@1.0.0
```

## Features

- **EJS Template Engine**: Full JavaScript expression support
- **Template Caching**: Compiled templates are cached with automatic invalidation
- **Helper Functions**: Built-in and custom helper function support
- **File-Based Templates**: Direct rendering from filesystem
- **Template Directories**: Multiple search directories with priorities
- **Validation**: Syntax checking without rendering
- **Backward Compatible**: All legacy methods still work

## Usage

### Basic Rendering

```typescript
const templateService = context.getService<IEnhancedTemplateService>(
  'core.TemplateService@1.0.0'
);

// Render from file
const output = await templateService.renderFile('./template.ejs', {
  name: 'World',
  items: ['a', 'b', 'c'],
});

// Render from string
const output = await templateService.renderString(
  'Hello, <%= name %>!',
  { name: 'World' }
);
```

### Template Compilation (for reuse)

```typescript
// Pre-compile a template
const compiled = await templateService.compileTemplate('./service.ts.ejs');

// Reuse multiple times (very fast)
const service1 = await compiled({ name: 'Service1' });
const service2 = await compiled({ name: 'Service2' });
const service3 = await compiled({ name: 'Service3' });
```

### Using Helpers

```typescript
// Built-in helpers are automatically available
const output = await templateService.renderString(
  'Class: <%= helpers.pascalCase(name) %>',
  { name: 'my_service' }
);
// Result: "Class: MyService"

// Register custom helpers
templateService.registerHelper('double', (n: number) => n * 2);
templateService.registerHelpers({
  triple: (n: number) => n * 3,
  half: (n: number) => n / 2,
});
```

### Template Directories

```typescript
// Add search directory (higher priority = checked first)
templateService.addTemplateDirectory('./my-templates', 100);

// Templates can now be resolved by name
const output = await templateService.renderFile('my-template.ejs', data);
```

### Validation

```typescript
// Validate template syntax
const result = await templateService.validateTemplate('./template.ejs');

if (!result.valid) {
  console.error('Errors:', result.errors);
}

// List variables used in template
console.log('Variables:', result.variables);
```

### Cache Management

```typescript
// Get cache statistics
const stats = templateService.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Cached templates: ${stats.size}`);

// Clear specific cache entry
templateService.clearCache('./template.ejs');

// Clear all cache
templateService.clearCache();
```

## Built-in Helpers

| Helper | Description | Example |
|--------|-------------|---------|
| `pascalCase(str)` | Convert to PascalCase | `hello_world` → `HelloWorld` |
| `camelCase(str)` | Convert to camelCase | `hello_world` → `helloWorld` |
| `kebabCase(str)` | Convert to kebab-case | `HelloWorld` → `hello-world` |
| `snakeCase(str)` | Convert to snake_case | `HelloWorld` → `hello_world` |
| `upperSnakeCase(str)` | Convert to UPPER_SNAKE | `HelloWorld` → `HELLO_WORLD` |
| `mapType(type)` | Map to TypeScript type | `integer` → `number` |
| `formatJSDoc(text, indent)` | Format as JSDoc comment | Multi-line JSDoc |
| `timestamp(format?)` | Current timestamp | `2026-02-04T10:30:00Z` |
| `indent(text, spaces)` | Indent text | Add leading spaces |
| `comment(text, style)` | Create code comment | `// comment` |
| `join(arr, sep)` | Join array | `a, b, c` |
| `first(arr)` | First array element | First item |
| `last(arr)` | Last array element | Last item |
| `ifDefined(val, default)` | Value or default | Non-null value |
| `pluralize(word, count)` | Pluralize word | `items` |
| `quote(str, style)` | Quote string | `'string'` |
| `escapeHtml(str)` | Escape HTML | `&lt;div&gt;` |
| `json(obj, indent)` | JSON stringify | `{"a":1}` |
| `repeat(str, n)` | Repeat string | `abcabc` |
| `truncate(str, len)` | Truncate with ellipsis | `hello...` |

## EJS Syntax Reference

```ejs
<%# Comment - not in output %>
<%= value %>        // Escaped output
<%- value %>        // Unescaped output (for HTML/code)
<% code %>          // JavaScript (no output)

// Conditionals
<% if (condition) { %>
  Content when true
<% } else { %>
  Content when false
<% } %>

// Loops
<% items.forEach(function(item, i) { %>
  <%= item.name %><%= i < items.length - 1 ? ',' : '' %>
<% }); %>

// Using helpers
<%= helpers.pascalCase(name) %>
<%- helpers.json(config, 2) %>
```

## API Reference

### Rendering Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `renderFile(path, data, options?)` | `Promise<string>` | Render template from file |
| `renderString(template, data, options?)` | `Promise<string>` | Render template string |
| `renderTemplate(template, properties)` | `string` | Legacy sync rendering |

### Compilation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `compileTemplate(path, cacheKey?)` | `Promise<CompiledTemplate>` | Pre-compile template |

### Helper Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `registerHelper(name, fn)` | `void` | Register a helper |
| `registerHelpers(helpers)` | `void` | Register multiple helpers |
| `getHelpers()` | `Record<string, Function>` | Get all helpers |
| `unregisterHelper(name)` | `void` | Remove a helper |

### Directory Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `addTemplateDirectory(path, priority?)` | `void` | Add search directory |
| `removeTemplateDirectory(path)` | `void` | Remove directory |
| `getTemplateDirectories()` | `TemplateDirectory[]` | List directories |
| `resolveTemplatePath(name)` | `string \| null` | Resolve template path |

### Cache Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `clearCache(key?)` | `void` | Clear cache |
| `getCacheStats()` | `TemplateCacheStats` | Get statistics |

### Validation Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `validateTemplate(pathOrString, isFile?)` | `Promise<TemplateValidationResult>` | Validate template |

## Render Options

```typescript
interface TemplateRenderOptions {
  cache?: boolean;           // Enable caching (default: true)
  async?: boolean;           // Async rendering (default: true)
  filename?: string;         // For error reporting
  helpers?: Record<string, Function>;  // Additional helpers
  strict?: boolean;          // Throw on undefined
  encoding?: BufferEncoding; // File encoding
  timeout?: number;          // Render timeout
  resolveIncludes?: boolean; // Auto-resolve includes
  includeBasePath?: string;  // Include base path
}
```

## For AI Agents

### Quick Reference

```typescript
// Service ID
const TEMPLATE_SERVICE = 'core.TemplateService@1.0.0';

// Get service
const ts = context.getService<IEnhancedTemplateService>(TEMPLATE_SERVICE);

// Key methods
await ts.renderFile(path, data, options);
await ts.renderString(template, data, options);
await ts.compileTemplate(path);
ts.registerHelper(name, fn);
ts.getCacheStats();
ts.clearCache();
```

### Common Tasks

**Render code template:**
```typescript
const code = await ts.renderFile('./templates/class.ts.ejs', {
  className: 'MyService',
  methods: [{ name: 'execute', params: [] }],
});
```

**Compile for batch processing:**
```typescript
const template = await ts.compileTemplate('./templates/item.ejs');
const items = configs.map(config => template(config));
const results = await Promise.all(items);
```

**Add project templates:**
```typescript
ts.addTemplateDirectory(path.join(__dirname, 'templates'), 100);
```

**Check cache performance:**
```typescript
const stats = ts.getCacheStats();
if (stats.hitRate < 80) {
  console.warn('Low cache hit rate:', stats.hitRate);
}
```

## Dependencies

None (core service).

## Related Services

- [Service Generator](../generators/service/README.md) - Uses TemplateService for code generation
- [Module Generator](../generators/module/README.md) - Uses TemplateService for module scaffolding

---

**Version:** 1.0.0  
**Module:** reactory-core  
**Path:** `/src/modules/reactory-core/services/TemplateService/`
