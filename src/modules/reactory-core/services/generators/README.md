# Reactory Generators

> Code generation services for the Reactory platform

## Overview

The generators module provides code generation capabilities for various Reactory components including services, forms, modules, and database schemas. Each generator uses the Reactory TemplateService with EJS templates to produce consistent, production-ready code.

## Available Generators

| Generator | Service ID | Description |
|-----------|-----------|-------------|
| [Service Generator](./service/README.md) | `core.ServiceGenerator@1.0.0` | Generate TypeScript services from YAML definitions **with OpenAPI/Swagger support** |
| [Module Generator](./module/README.md) | `core.ReactoryModuleGenerator@1.0.0` | Generate Reactory module structure |
| [Postgres Table Generator](./database/postgres/README.md) | `core.PostgresTableToFormGenerator@1.0.0` | Generate forms from Postgres table schemas |

### 🆕 Service Generator Features

The Service Generator has been enhanced with comprehensive OpenAPI/Swagger support:

- ✅ **Auto-generate from specs**: Load OpenAPI 3.x or Swagger 2.0 specifications
- ✅ **File or URL**: Support for local files and remote URLs
- ✅ **Full coverage**: All endpoints, parameters, and schemas automatically typed
- ✅ **Flexible**: Combine spec-generated endpoints with custom endpoints
- ✅ **Production-ready**: 72 tests with 100% passing rate

**Quick Example:**
```yaml
id: api.MyService@1.0.0
name: MyService
nameSpace: api
version: 1.0.0
serviceType: rest
dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService
spec:
  swagger: ./swagger.json  # or URL: https://api.example.com/swagger.json
```

See [Service Generator README](./service/README.md) and [Swagger Quick Reference](./service/swagger/QUICK_REFERENCE.md) for details.

## Directory Structure

```
generators/
├── README.md                    # This file
├── index.ts                     # Exports all generators
├── types.ts                     # Common generator types
├── database/                    # Database-related generators
│   ├── index.ts
│   ├── mongo/                   # MongoDB generators (placeholder)
│   ├── mysql/                   # MySQL generators (placeholder)
│   ├── postgres/                # PostgreSQL generators
│   │   ├── PostgresTableGenerator.ts
│   │   └── ReactoryPostgresGenerator.ts
│   └── sqlserver/               # SQL Server generators (placeholder)
├── module/                      # Module generation
│   ├── ModuleGenerator.ts
│   └── templates/               # Module EJS templates
└── service/                     # Service generation
    ├── ServiceGenerator.ts
    ├── types.ts
    ├── README.md
    └── templates/               # Service EJS templates
```

## Common Usage Patterns

### Getting a Generator

```typescript
// Get service generator
const serviceGenerator = context.getService('core.ServiceGenerator@1.0.0');

// Get module generator
const moduleGenerator = context.getService('core.ReactoryModuleGenerator@1.0.0');

// Get postgres generator
const postgresGenerator = context.getService('core.PostgresTableToFormGenerator@1.0.0');
```

### Generator Interface

All generators implement a common pattern:

```typescript
interface Generator {
  // Generate from file/definition
  generate(input: any): Promise<GenerationResult>;
  
  // Validate input before generation
  validate(input: any): ValidationResult;
}
```

## Creating New Generators

### 1. Create Generator Folder

```
generators/
└── my-generator/
    ├── MyGenerator.ts
    ├── types.ts
    ├── index.ts
    ├── README.md
    └── templates/
        └── my-template.ejs
```

### 2. Implement Generator Service

```typescript
import Reactory from '@reactory/reactory-core';
import { service } from '@reactory/server-core/application/decorators';

@service({
  id: 'core.MyGenerator@1.0.0',
  nameSpace: 'core',
  name: 'MyGenerator',
  version: '1.0.0',
  description: 'My custom generator',
  serviceType: 'codeGeneration',
  dependencies: [
    { id: 'core.TemplateService@1.0.0', alias: 'templateService' }
  ],
})
class MyGenerator implements Reactory.Service.IReactoryService {
  // Implementation
}

export default MyGenerator;
```

### 3. Create EJS Templates

```ejs
<%# templates/my-template.ejs %>
/**
 * Generated: <%= generatedDate %>
 */
export class <%= className %> {
  // Generated code
}
```

### 4. Add to Index

Update `generators/index.ts`:

```typescript
import MyGenerator from './my-generator';

export default [
  // ... existing generators
  MyGenerator,
];
```

### 5. Create README

Document your generator with:
- Overview and purpose
- Service ID
- Input schema
- Output description
- Usage examples
- AI agent quick reference

## Template Guidelines

### EJS Syntax Quick Reference

```ejs
<%# Comment - not included in output %>
<%= escaped output %>
<%- unescaped output (use for code) %>
<% JavaScript code (no output) %>

<% if (condition) { %>
  Conditional content
<% } %>

<% items.forEach(function(item) { %>
  <%= item.name %>
<% }); %>
```

### Available Helpers

All templates have access to helpers via the `helpers` object:

| Helper | Description | Example |
|--------|-------------|---------|
| `pascalCase` | Convert to PascalCase | `MyService` |
| `camelCase` | Convert to camelCase | `myService` |
| `kebabCase` | Convert to kebab-case | `my-service` |
| `snakeCase` | Convert to snake_case | `my_service` |
| `upperSnakeCase` | Convert to UPPER_SNAKE | `MY_SERVICE` |
| `mapType` | Map YAML to TS types | `number` |
| `indent` | Indent text | indented string |
| `comment` | Create comment | `// text` |
| `quote` | Quote string | `'text'` |
| `json` | JSON stringify | `{"a":1}` |

### Template Best Practices

1. **Use helpers** for string transformations
2. **Add comments** describing generated sections
3. **Include generation metadata** (date, source)
4. **Handle edge cases** (empty arrays, null values)
5. **Maintain consistent indentation**

## For AI Agents

### Generator Discovery

```typescript
// List all generator services
const generators = context.listServices({ type: 'codeGeneration' });

// Common generator IDs
const GENERATORS = {
  service: 'core.ServiceGenerator@1.0.0',
  module: 'core.ReactoryModuleGenerator@1.0.0',
  postgresForm: 'core.PostgresTableToFormGenerator@1.0.0',
};
```

### Common Operations

**Generate service from YAML:**
```bash
# Using the reactory executable
reactory service-gen -c ./service.yaml -o ./src/services

# Or using the CLI script directly
bin/cli.sh service-gen -c ./service.yaml -o ./src/services
```

**Generate service from OpenAPI/Swagger:**
```bash
# From local spec file
reactory service-gen -c ./service-with-swagger.yaml -o ./src/services

# Example service-with-swagger.yaml:
# spec:
#   swagger: ./swagger.json
```

**Generate module structure:**
```bash
reactory module-gen --name MyModule --namespace myapp
```

**Generate form from database:**
```bash
reactory form-gen --connection mydb --table users
```

### File Locations

- Generator implementations: `src/modules/reactory-core/services/generators/`
- Templates: `generators/*/templates/`
- Type definitions: `generators/*/types.ts`

---

**Module:** reactory-core  
**Path:** `/src/modules/reactory-core/services/generators/`
