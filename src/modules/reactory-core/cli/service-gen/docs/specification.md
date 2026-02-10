# Service Generator CLI Utility - Technical Specification

## Overview

The Service Generator CLI utility (`service-gen`) is a code generation tool for the Reactory platform that automates the creation of TypeScript service classes that wrap REST, gRPC, GraphQL, or SQL interfaces. The generator reads YAML service definition files and emits fully-typed TypeScript service classes with proper dependency injection, error handling, and Reactory integration.

## Command Line Interface

### Basic Usage

```bash
# Using the Reactory CLI
reactory service-gen [options]

# Direct invocation
cli.sh service-gen [options]
```

### Command Line Arguments

| Flag | Long Form | Required | Description | Example |
|------|-----------|----------|-------------|---------|
| `-c` | `--config` | Yes* | Path to YAML service configuration file | `-c ./service.yaml` |
| `-d` | `--directory` | Yes* | Directory containing multiple service YAML files | `-d ./services/` |
| `-o` | `--output` | No | Output directory for generated files | `-o ./generated/` |
| `-t` | `--template` | No | Custom template file for code generation | `-t ./templates/service.ts.template` |
| `-f` | `--format` | No | Output format (ts, js, both) | `-f ts` |
| `-w` | `--watch` | No | Watch mode for file changes | `-w` |
| `-dr` | `--dry-run` | No | Preview generated code without writing files | `-dr` |
| `-v` | `--verbose` | No | Enable verbose logging | `-v` |
| `-ow` | `--overwrite` | No | Overwrite existing files | `-ow` |
| `-l` | `--list-templates` | No | List available templates | `-l` |
| `-h` | `--help` | No | Display help information | `-h` |

*Either `--config` or `--directory` must be provided.

### Examples

```bash
# Generate a single service from YAML
reactory service-gen -c ./services/loyalty-api/service.yaml -o ./generated/

# Generate multiple services from a directory
reactory service-gen -d ./services/ -o ./generated/

# Dry run to preview output
reactory service-gen -c ./service.yaml --dry-run

# Watch mode with verbose logging
reactory service-gen -d ./services/ -o ./generated/ -w -v

# List available templates
reactory service-gen --list-templates
```

## Service Definition YAML Schema

### Root Level Properties

```yaml
# Service Identification
id: string                    # Fully qualified service ID (namespace.name@version)
name: string                  # Service name
nameSpace: string             # Service namespace
version: string               # Semantic version
description: string           # Service description

# Service Configuration
serviceType: string           # Type: 'rest' | 'grpc' | 'graphql' | 'sql' | 'hybrid'
dependencies: array           # Array of service dependencies
tags: array                   # Array of string tags for categorization
roles: array                  # Required roles for service access

# Service Specification
spec: object                  # Protocol-specific specifications
authentication: object        # Authentication configuration
caching: object              # Caching configuration
retry: object                # Retry policy configuration
timeout: number              # Request timeout in milliseconds
rateLimit: object            # Rate limiting configuration
```

### Dependency Definition

```yaml
dependencies:
  - id: string               # Service ID (e.g., "core.FetchService@1.0.0")
    alias: string            # Alias for accessing the service
    required: boolean        # Whether dependency is required (default: true)
    lazy: boolean           # Lazy loading (default: false)
```

### REST Specification

```yaml
spec:
  rest:
    baseUrl: string          # Base URL for REST API
    headers: object          # Default headers
    endpoints:
      - path: string         # Endpoint path
        method: string       # HTTP method (GET, POST, PUT, DELETE, PATCH)
        handler: string      # Method name in generated class
        description: string  # Endpoint description
        params: array        # Path parameters
        query: array         # Query parameters
        body: object         # Request body schema
        response: object     # Response schema
        authentication: boolean  # Requires authentication
        cache: boolean       # Enable caching for this endpoint
        timeout: number      # Override timeout for this endpoint
```

### gRPC Specification

```yaml
spec:
  grpc:
    protoPath: string        # Path to .proto file
    serviceName: string      # Service name in proto file
    packageName: string      # Package name
    endpoints:
      - rpc: string          # RPC method name
        handler: string      # Method name in generated class
        description: string  # Method description
        streaming: string    # 'none' | 'client' | 'server' | 'bidirectional'
        timeout: number      # Override timeout
```

### GraphQL Specification

```yaml
spec:
  graphql:
    endpoint: string         # GraphQL endpoint URL
    operations:
      - type: string         # 'query' | 'mutation' | 'subscription'
        name: string         # Operation name
        handler: string      # Method name in generated class
        description: string  # Operation description
        query: string        # GraphQL query/mutation string
        variables: object    # Variable definitions
        cache: boolean       # Enable caching
```

### SQL Specification

```yaml
spec:
  sql:
    dataSource: string       # Data source identifier
    queries:
      - name: string         # Query identifier
        handler: string      # Method name in generated class
        description: string  # Query description
        query: string        # SQL query (can use named parameters)
        params: array        # Parameter definitions
        returnType: string   # 'single' | 'many' | 'scalar'
        transaction: boolean # Run in transaction
```

### OpenAPI/Swagger Integration

```yaml
spec:
  openapi: string            # URL or path to OpenAPI/Swagger spec
  swagger: string            # URL or path to Swagger spec (v2)
  operations:                # Override/extend specific operations
    - operationId: string    # Operation ID from spec
      handler: string        # Custom handler name
      override: object       # Override properties
```

### Authentication Configuration

```yaml
authentication:
  type: string               # 'none' | 'basic' | 'bearer' | 'apiKey' | 'oauth2' | 'custom'
  
  # For Basic Auth
  credentials:
    username: string
    password: string
  
  # For Bearer Token
  token: string
  tokenProvider: string      # Service ID for dynamic token provider
  
  # For API Key
  apiKey: string
  apiKeyHeader: string       # Header name (default: 'X-API-Key')
  
  # For OAuth2
  oauth2:
    clientId: string
    clientSecret: string
    tokenUrl: string
    scopes: array
  
  # For Custom
  custom:
    provider: string         # Service ID for custom auth provider
```

### Caching Configuration

```yaml
caching:
  enabled: boolean           # Enable caching
  ttl: number               # Time to live in seconds
  keyPattern: string        # Cache key pattern template
  invalidateOn: array       # Events that invalidate cache
  store: string             # 'memory' | 'redis' | 'custom'
```

### Retry Policy Configuration

```yaml
retry:
  enabled: boolean           # Enable retry
  maxAttempts: number       # Maximum retry attempts (default: 3)
  backoff: string           # 'fixed' | 'exponential' | 'linear'
  initialDelay: number      # Initial delay in ms (default: 1000)
  maxDelay: number          # Maximum delay in ms (default: 30000)
  retryOn: array            # Error codes/conditions to retry on
```

### Rate Limiting Configuration

```yaml
rateLimit:
  enabled: boolean           # Enable rate limiting
  maxRequests: number       # Maximum requests
  window: number            # Time window in seconds
  strategy: string          # 'sliding' | 'fixed'
  scope: string             # 'global' | 'user' | 'ip'
```

## Complete Example Service Definition

```yaml
# Service Identity
id: worldremit.LoyaltyApiService@1.0.0
name: LoyaltyApiService
nameSpace: worldremit
version: 1.0.0
description: Service for managing loyalty API operations with caching and retry logic
serviceType: rest

# Tags and Access Control
tags: [loyalty, api, external]
roles: [USER, ADMIN]

# Dependencies
dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService
    required: true
  - id: core.CacheService@1.0.0
    alias: cacheService
    required: false
  - id: core.TelemetryService@1.0.0
    alias: telemetry
    required: false

# Authentication
authentication:
  type: bearer
  tokenProvider: core.AuthService@1.0.0

# Caching
caching:
  enabled: true
  ttl: 300
  store: redis
  keyPattern: "loyalty:${method}:${userId}"

# Retry Policy
retry:
  enabled: true
  maxAttempts: 3
  backoff: exponential
  initialDelay: 1000
  retryOn: [500, 502, 503, 504]

# Rate Limiting
rateLimit:
  enabled: true
  maxRequests: 100
  window: 60
  strategy: sliding
  scope: user

# Global Timeout
timeout: 30000

# Service Specification
spec:
  # OpenAPI Integration
  openapi: https://api.worldremit.com/loyalty/v1/openapi.json
  
  # REST Endpoints
  rest:
    baseUrl: https://api.worldremit.com/loyalty/v1
    headers:
      Accept: application/json
      Content-Type: application/json
    
    endpoints:
      - path: /points/{userId}
        method: GET
        handler: getUserPoints
        description: Get loyalty points for a user
        params:
          - name: userId
            type: string
            required: true
        query:
          - name: includeHistory
            type: boolean
            required: false
        response:
          type: object
          properties:
            userId: string
            points: number
            tier: string
        authentication: true
        cache: true
        timeout: 10000
      
      - path: /points/{userId}/add
        method: POST
        handler: addPoints
        description: Add points to user account
        params:
          - name: userId
            type: string
            required: true
        body:
          type: object
          required: true
          properties:
            amount: number
            reason: string
            transactionId: string
        response:
          type: object
          properties:
            success: boolean
            newBalance: number
        authentication: true
        cache: false
      
      - path: /tiers
        method: GET
        handler: getTiers
        description: Get available loyalty tiers
        response:
          type: array
          items:
            type: object
            properties:
              id: string
              name: string
              minPoints: number
              benefits: array
        cache: true
        authentication: false
```

## Generated Code Structure

### Generated Service Class Template

The service generator uses EJS (Embedded JavaScript) templates via the Reactory TemplateService. Below is an example of the generated output structure:

```typescript
import { service } from "@reactory/server-core/application/decorators";
import Reactory from "@reactory/reactory-core";

/**
 * <%= description %>
 * 
 * Generated by Reactory Service Generator
 * Generated on: <%= generatedDate %>
 * Source: <%= sourceFile %>
 */
@service({
  id: "<%= id %>",
  name: "<%= name %>",
  nameSpace: "<%= nameSpace %>",
  description: "<%= description %>",
  serviceType: "<%= serviceType %>",
  dependencies: [
    <% dependencies.forEach(function(dep, index) { %>
    { id: "<%= dep.id %>", alias: "<%= dep.alias %>" }<%= index < dependencies.length - 1 ? ',' : '' %>
    <% }); %>
  ],
})
export default class <%= className %> implements Reactory.Service.IReactoryService {
  // Service Properties
  nameSpace: string = "<%= nameSpace %>";
  name: string = "<%= name %>";
  version: string = "<%= version %>";
  description?: string = "<%= description %>";
  tags?: string[] = [<% tags.forEach(function(tag, index) { %>"<%= tag %>"<%= index < tags.length - 1 ? ', ' : '' %><% }); %>];

  // Dependencies
  <% dependencies.forEach(function(dep) { %>
  private readonly <%= dep.alias %>: any;
  <% }); %>

  // Context
  private readonly context: Reactory.Server.IReactoryContext;

  // Configuration
  private readonly config = {
    baseUrl: "<%= spec.rest.baseUrl %>",
    timeout: <%= timeout %>,
    retryConfig: <%- JSON.stringify(retry, null, 2) %>,
    cachingConfig: <%- JSON.stringify(caching, null, 2) %>,
  };

  constructor(
    props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.context = context;
    
    // Initialize dependencies
    <% dependencies.forEach(function(dep) { %>
    this.<%= dep.alias %> = (props.dependencies as any)?.<%= dep.alias %>;
    <% }); %>

    // Validate required dependencies
    <% dependencies.forEach(function(dep) { %>
    <% if (dep.required) { %>
    if (!this.<%= dep.alias %>) {
      throw new Error("Required dependency <%= dep.alias %> not found");
    }
    <% } %>
    <% }); %>
  }

  toString(includeVersion?: boolean): string {
    return includeVersion 
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : `${this.nameSpace}.${this.name}`;
  }

  toStringWithVersion(): string {
    return `${this.nameSpace}.${this.name}@${this.version}`;
  }

  <% spec.rest.endpoints.forEach(function(endpoint) { %>
  /**
   * <%= endpoint.description %>
   * @param params - Request parameters
   * @returns Promise<<%= endpoint.response.type %>>
   */
  async <%= endpoint.handler %>(params: {
    <% endpoint.params.forEach(function(param) { %>
    <%= param.name %><%= param.required ? '' : '?' %>: <%= param.type %>;
    <% }); %>
    <% endpoint.query.forEach(function(query) { %>
    <%= query.name %>?<%= query.required ? '' : '?' %>: <%= query.type %>;
    <% }); %>
    <% if (endpoint.body) { %>
    body: {
      <% Object.keys(endpoint.body.properties).forEach(function(key) { %>
      <%= key %>: <%= endpoint.body.properties[key] %>;
      <% }); %>
    };
    <% } %>
  }): Promise<any> {
    const method = "<%= endpoint.method %>";
    const path = this.buildPath("<%= endpoint.path %>", params);
    const url = `${this.config.baseUrl}${path}`;

    try {
      <% if (endpoint.cache) { %>
      // Check cache
      const cacheKey = this.getCacheKey("<%= endpoint.handler %>", params);
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        this.context.debug(`Cache hit for ${method} ${path}`);
        return cached;
      }
      <% } %>

      // Make request
      const response = await this.makeRequest({
        method,
        url,
        <% if (endpoint.body) { %>
        body: params.body,
        <% } %>
        timeout: <%= endpoint.timeout || 'this.config.timeout' %>,
      });

      <% if (endpoint.cache) { %>
      // Store in cache
      await this.setInCache(cacheKey, response);
      <% } %>

      return response;
    } catch (error) {
      this.context.error(
        `Error in <%= endpoint.handler %>`,
        { error, params },
        "<%= className %>.<%= endpoint.handler %>"
      );
      throw error;
    }
  }

  <% }); %>

  // Private Helper Methods

  private buildPath(template: string, params: any): string {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return params[key] || match;
    });
  }

  private async makeRequest(options: {
    method: string;
    url: string;
    body?: any;
    timeout?: number;
  }): Promise<any> {
    // Implement with retry logic
    const { maxAttempts, backoff, initialDelay } = this.config.retryConfig;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.fetchService.fetch(options.url, {
          method: options.method,
          body: options.body ? JSON.stringify(options.body) : undefined,
          timeout: options.timeout,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          const delay = this.calculateBackoff(attempt, backoff, initialDelay);
          this.context.debug(`Retry attempt ${attempt} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private calculateBackoff(
    attempt: number,
    strategy: string,
    initialDelay: number
  ): number {
    switch (strategy) {
      case "exponential":
        return initialDelay * Math.pow(2, attempt - 1);
      case "linear":
        return initialDelay * attempt;
      case "fixed":
      default:
        return initialDelay;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCacheKey(method: string, params: any): string {
    // Generate cache key based on method and params
    return `${this.nameSpace}.${this.name}:${method}:${JSON.stringify(params)}`;
  }

  private async getFromCache(key: string): Promise<any> {
    if (!this.cacheService || !this.config.cachingConfig.enabled) {
      return null;
    }
    return await this.cacheService.get(key);
  }

  private async setInCache(key: string, value: any): Promise<void> {
    if (!this.cacheService || !this.config.cachingConfig.enabled) {
      return;
    }
    await this.cacheService.set(key, value, this.config.cachingConfig.ttl);
  }
}
```

## CLI Implementation Structure

### File Organization

```
src/modules/reactory-core/cli/service-gen/
├── docs/
│   └── specification.md           # This document
├── templates/
│   ├── service.rest.ts.ejs       # REST service EJS template
│   ├── service.grpc.ts.ejs       # gRPC service EJS template
│   ├── service.graphql.ts.ejs    # GraphQL service EJS template
│   ├── service.sql.ts.ejs        # SQL service EJS template
│   └── service.hybrid.ts.ejs     # Hybrid service EJS template
├── generators/
│   ├── RestServiceGenerator.ts    # REST generator
│   ├── GrpcServiceGenerator.ts    # gRPC generator
│   ├── GraphQLServiceGenerator.ts # GraphQL generator
│   ├── SqlServiceGenerator.ts     # SQL generator
│   └── BaseServiceGenerator.ts    # Base generator class
├── parsers/
│   ├── YamlParser.ts             # YAML parser
│   ├── OpenApiParser.ts          # OpenAPI/Swagger parser
│   └── ProtoParser.ts            # Proto file parser
├── validators/
│   └── ServiceValidator.ts        # Service definition validator
├── utils/
│   ├── TypeMapper.ts             # Type mapping utilities
│   └── FileWriter.ts             # File writing utilities
├── ServiceGenCli.ts              # Main CLI implementation
└── index.ts                      # Exports
```

### Template Service Integration

The service generator leverages the Reactory TemplateService (`core.TemplateService@1.0.0`) for all template rendering operations. The TemplateService provides:

- **EJS Template Engine**: Embedded JavaScript templating with full JavaScript expression support
- **Template Caching**: Compiled templates are cached for performance
- **Partial Support**: Reusable template fragments
- **Custom Filters**: Built-in and custom filters for data transformation
- **Error Handling**: Detailed error reporting for template syntax issues

#### Using TemplateService in the Generator

```typescript
// In ServiceGenCli.ts
const templateService = context.getService<Reactory.Service.IReactoryTemplateService>(
  'core.TemplateService@1.0.0'
);

// Render a service template
const serviceCode = await templateService.render({
  template: templatePath,  // Path to .ejs file
  data: {
    id,
    name,
    nameSpace,
    version,
    description,
    serviceType,
    dependencies,
    spec,
    className,
    generatedDate: new Date().toISOString(),
    sourceFile: configPath,
    // ... other template variables
  },
  options: {
    cache: true,  // Enable template caching
  }
});
```

#### Template Service Dependency

The ServiceGenCli must declare a dependency on the TemplateService:

```typescript
dependencies: [
  { id: "core.TemplateService@1.0.0", alias: "templateService" }
]
```

### Main CLI Function Signature

```typescript
import Reactory from "@reactory/reactory-core";
import { ReadLine } from "readline";

/**
 * Service Generator CLI - Main entry point
 * 
 * This CLI tool generates TypeScript service classes from YAML service definitions.
 * It uses the Reactory TemplateService for EJS template rendering.
 * 
 * @param kwargs - Command line arguments
 * @param context - Reactory context providing access to services
 */
const ServiceGenCli = async (
  kwargs: string[],
  context: Reactory.Server.IReactoryContext
): Promise<void> => {
  // Get required services
  const templateService = context.getService<Reactory.Service.IReactoryTemplateService>(
    'core.TemplateService@1.0.0'
  );
  
  if (!templateService) {
    context.error('TemplateService not available');
    process.exit(1);
  }

  // Parse command line arguments
  // Load and validate service definitions
  // Generate service code using templates
  // Write output files
};

/**
 * CLI Component Definition
 */
export default {
  nameSpace: "core",
  name: "ServiceGen",
  version: "1.0.0",
  description: "Generate TypeScript service classes from YAML definitions using EJS templates",
  component: ServiceGenCli,
  domain: Reactory.ComponentDomain.plugin,
  features: [
    {
      feature: "ServiceGen",
      featureType: Reactory.FeatureType.function,
      action: ["generate", "service-generate"],
      stem: "generate",
    },
  ],
  overwrite: false,
  roles: ["USER"],
  stem: "generate",
  tags: ["service", "cli", "generator", "codegen", "ejs"],
  toString(includeVersion) {
    return includeVersion
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : this.name;
  },
} as Reactory.IReactoryComponentDefinition<typeof ServiceGenCli>;
```

### Template Service Methods

The generator utilizes the following TemplateService methods:

#### render(options)
Renders a template with provided data.

```typescript
interface RenderOptions {
  template: string;           // Path to template file or template string
  data: any;                 // Template data object
  options?: {
    cache?: boolean;         // Enable template caching (default: true)
    async?: boolean;         // Enable async rendering (default: true)
    filename?: string;       // Template filename for error reporting
  };
}

const result = await templateService.render({
  template: '/path/to/template.ejs',
  data: { /* template variables */ },
  options: { cache: true }
});
```

#### renderString(templateString, data)
Renders a template from a string.

```typescript
const templateString = `
class <%= className %> {
  constructor() {
    this.name = '<%= name %>';
  }
}
`;

const result = await templateService.renderString(templateString, {
  className: 'MyService',
  name: 'My Service'
});
```

#### compileTemplate(templatePath)
Pre-compiles a template for reuse.

```typescript
const compiledTemplate = await templateService.compileTemplate(
  '/path/to/template.ejs'
);

// Use compiled template multiple times
const result1 = await compiledTemplate({ name: 'Service1' });
const result2 = await compiledTemplate({ name: 'Service2' });
```

## Error Handling

The generator should handle the following error scenarios:

1. **Invalid YAML**: Syntax errors in service definition
2. **Missing Required Fields**: Validation errors for incomplete definitions
3. **Invalid Types**: Type mismatches in service definitions
4. **Template Errors**: Issues with template rendering
5. **File System Errors**: Permission issues, missing directories
6. **Dependency Resolution**: Missing or invalid service dependencies
7. **OpenAPI/Swagger Errors**: Failed to fetch or parse external specs

## Validation Rules

### Service Definition Validation

1. **Required Fields**: `id`, `name`, `nameSpace`, `version`, `serviceType`, `spec`
2. **ID Format**: Must match pattern `{namespace}.{name}@{version}`
3. **Version**: Must be valid semantic version
4. **ServiceType**: Must be one of: `rest`, `grpc`, `graphql`, `sql`, `hybrid`
5. **Dependencies**: All dependency IDs must be valid FQNs
6. **Handlers**: All handler names must be valid TypeScript identifiers
7. **Endpoints**: No duplicate paths with same method
8. **Types**: All referenced types must be defined

## Future Enhancements

1. **TypeScript Type Generation**: Generate interfaces/types from schemas
2. **Test Generation**: Generate unit tests for services
3. **Documentation Generation**: Generate API documentation
4. **Mock Generation**: Generate mock services for testing
5. **Validation Code**: Generate runtime validation code
6. **Migration Tools**: Convert existing services to YAML definitions
7. **IDE Support**: VSCode extension with autocomplete for YAML
8. **Live Reload**: Hot reload services during development
9. **Diff Tool**: Compare generated code with existing implementations
10. **Interactive Mode**: Wizard-style service creation

## Integration with Reactory Ecosystem

### Service Registry

Generated services are automatically registered with the Reactory service registry when the module loads.

### Dependency Injection

Services use Reactory's dependency injection system through the `@service` decorator.

### Context Integration

All services receive the Reactory context for logging, configuration, and accessing other services.

### Telemetry

Generated services can optionally include telemetry integration for monitoring and tracing.

### Module System

Generated services integrate with the Reactory module system and can be included in module definitions.

### Template Service Integration

The generator uses the Reactory TemplateService (`core.TemplateService@1.0.0`) which provides:

- **EJS Templating**: Full JavaScript expression support in templates
- **Auto-escaping**: Prevents XSS in generated code (use `<%- %>` for unescaped output)
- **Includes**: Support for template partials and reusable components
- **Custom Helpers**: Register custom template helper functions

## EJS Template Features and Helpers

### Built-in EJS Tags

```ejs
<% /* JavaScript code (no output) */ %>
<%= /* Escaped output */ %>
<%- /* Unescaped output (use for code generation) */ %>
<%# /* Comment (not included in output) */ %>

<% /* Control flow */ %>
<% if (condition) { %>
  // output when true
<% } else { %>
  // output when false
<% } %>

<% /* Loops */ %>
<% items.forEach(function(item, index) { %>
  // output for each item
<% }); %>
```

### Template Helper Functions

The generator provides custom helper functions available in all templates:

```typescript
// Register helpers with TemplateService
const helpers = {
  // Convert to PascalCase for class names
  pascalCase: (str: string) => {
    return str.replace(/(\w)(\w*)/g, (g0, g1, g2) => {
      return g1.toUpperCase() + g2.toLowerCase();
    });
  },
  
  // Convert to camelCase for method names
  camelCase: (str: string) => {
    return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
  },
  
  // Convert to kebab-case for file names
  kebabCase: (str: string) => {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  },
  
  // Map YAML types to TypeScript types
  mapType: (yamlType: string) => {
    const typeMap = {
      'string': 'string',
      'number': 'number',
      'integer': 'number',
      'boolean': 'boolean',
      'array': 'any[]',
      'object': 'any',
    };
    return typeMap[yamlType] || 'any';
  },
  
  // Format JSDoc comments
  formatJSDoc: (text: string, indent: string = '') => {
    const lines = text.split('\n');
    return lines.map(line => `${indent} * ${line}`).join('\n');
  },
  
  // Generate method signature
  generateMethodSignature: (endpoint: any) => {
    // Generate TypeScript method signature from endpoint definition
  },
};
```

### Using Helpers in Templates

```ejs
/**
 * <%= helpers.formatJSDoc(description) %>
 */
export default class <%= helpers.pascalCase(name) %>Service {
  async <%= helpers.camelCase(endpoint.handler) %>(
    params: {
      <% endpoint.params.forEach(function(param) { %>
      <%= param.name %>: <%= helpers.mapType(param.type) %>;
      <% }); %>
    }
  ): Promise<<%= helpers.mapType(endpoint.response.type) %>> {
    // Implementation
  }
}
```

### Template Partials

Create reusable template fragments:

```
templates/
├── service.rest.ts.ejs           # Main template
└── partials/
    ├── constructor.ejs           # Constructor partial
    ├── helpers.ejs               # Helper methods partial
    ├── endpoint-method.ejs       # Endpoint method partial
    └── imports.ejs               # Imports partial
```

Using partials in main template:

```ejs
<%- include('partials/imports', { dependencies, serviceType }) %>

export default class <%= className %> {
  <%- include('partials/constructor', { dependencies }) %>
  
  <% endpoints.forEach(function(endpoint) { %>
  <%- include('partials/endpoint-method', { endpoint }) %>
  <% }); %>
  
  <%- include('partials/helpers', { config }) %>
}
```

## Testing Strategy

1. **Unit Tests**: Test individual generators, parsers, and validators
2. **Integration Tests**: Test end-to-end service generation
3. **Snapshot Tests**: Compare generated output with expected snapshots
4. **Validation Tests**: Test error handling and validation
5. **Template Tests**: Test EJS template rendering with various inputs
6. **TemplateService Integration Tests**: Test integration with Reactory TemplateService

### Example Test Cases

```typescript
describe('ServiceGenCli', () => {
  it('should render REST service using TemplateService', async () => {
    const templateService = context.getService('core.TemplateService@1.0.0');
    const output = await templateService.render({
      template: './templates/service.rest.ts.ejs',
      data: mockServiceConfig,
    });
    
    expect(output).toContain('export default class');
    expect(output).toContain('@service({');
  });
  
  it('should use cached templates for multiple renders', async () => {
    const spy = jest.spyOn(fs, 'readFileSync');
    
    await generateService(config1);
    await generateService(config2);
    
    // Template should only be read once due to caching
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

## Example Implementation

### Basic Generator Implementation

```typescript
import Reactory from "@reactory/reactory-core";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import colors from "colors/safe";

const HelpText = `
Service Generator CLI - Generate TypeScript services from YAML definitions

Parameters:
  -c, --config <file>          Path to service YAML file
  -d, --directory <dir>        Directory containing service YAML files
  -o, --output <dir>           Output directory (default: ./generated)
  -t, --template <file>        Custom template file
  -dr, --dry-run              Preview without writing files
  -v, --verbose               Enable verbose logging
  -h, --help                  Show this help
`;

interface ServiceConfig {
  id: string;
  name: string;
  nameSpace: string;
  version: string;
  description: string;
  serviceType: 'rest' | 'grpc' | 'graphql' | 'sql' | 'hybrid';
  dependencies: Array<{
    id: string;
    alias: string;
    required?: boolean;
  }>;
  spec: any;
  [key: string]: any;
}

const ServiceGenCli = async (
  kwargs: string[],
  context: Reactory.Server.IReactoryContext
): Promise<void> => {
  const rl = context.readline;
  
  // Parse arguments
  let configFile: string = null;
  let directory: string = null;
  let outputDir: string = './generated';
  let customTemplate: string = null;
  let dryRun: boolean = false;
  let verbose: boolean = false;
  let help: boolean = false;

  for (let i = 0; i < kwargs.length; i++) {
    const [arg, value] = kwargs[i].includes('=') 
      ? kwargs[i].split('=') 
      : [kwargs[i], kwargs[i + 1]];

    switch (arg) {
      case '-c':
      case '--config':
        configFile = value;
        break;
      case '-d':
      case '--directory':
        directory = value;
        break;
      case '-o':
      case '--output':
        outputDir = value;
        break;
      case '-t':
      case '--template':
        customTemplate = value;
        break;
      case '-dr':
      case '--dry-run':
        dryRun = true;
        break;
      case '-v':
      case '--verbose':
        verbose = true;
        break;
      case '-h':
      case '--help':
        help = true;
        break;
    }
  }

  if (help) {
    rl.write(colors.green(HelpText));
    return;
  }

  // Get TemplateService
  const templateService = context.getService<Reactory.Service.IReactoryTemplateService>(
    'core.TemplateService@1.0.0'
  );

  if (!templateService) {
    context.error('TemplateService not available');
    process.exit(1);
  }

  // Collect service configs
  const configs: ServiceConfig[] = [];

  if (configFile) {
    const config = loadServiceConfig(configFile);
    configs.push(config);
  } else if (directory) {
    const files = fs.readdirSync(directory)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    
    for (const file of files) {
      const fullPath = path.join(directory, file);
      configs.push(loadServiceConfig(fullPath));
    }
  } else {
    context.error('No config file or directory provided');
    process.exit(1);
  }

  if (verbose) {
    rl.write(colors.cyan(`Found ${configs.length} service(s) to generate\n`));
  }

  // Generate services
  for (const config of configs) {
    try {
      await generateService(config, {
        templateService,
        context,
        outputDir,
        customTemplate,
        dryRun,
        verbose,
      });

      rl.write(colors.green(`✓ Generated ${config.nameSpace}.${config.name}\n`));
    } catch (error) {
      context.error(`Failed to generate ${config.id}`, { error });
      rl.write(colors.red(`✗ Failed to generate ${config.id}: ${error.message}\n`));
    }
  }

  rl.write(colors.green(`\nGeneration complete. Generated ${configs.length} service(s).\n`));
};

function loadServiceConfig(filePath: string): ServiceConfig {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const config = yaml.load(fileContent) as ServiceConfig;
  
  // Validate required fields
  const required = ['id', 'name', 'nameSpace', 'version', 'serviceType'];
  for (const field of required) {
    if (!config[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  return config;
}

async function generateService(
  config: ServiceConfig,
  options: {
    templateService: Reactory.Service.IReactoryTemplateService;
    context: Reactory.Server.IReactoryContext;
    outputDir: string;
    customTemplate?: string;
    dryRun: boolean;
    verbose: boolean;
  }
): Promise<void> {
  const { templateService, context, outputDir, customTemplate, dryRun, verbose } = options;

  // Determine template path
  const templatePath = customTemplate || getDefaultTemplate(config.serviceType);

  // Prepare template data
  const templateData = {
    ...config,
    className: `${config.name}Service`,
    generatedDate: new Date().toISOString(),
    sourceFile: config.id,
    // Helper functions available in template
    helpers: {
      pascalCase: (str: string) => 
        str.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase()),
      camelCase: (str: string) => 
        str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase()),
      mapType: (yamlType: string) => {
        const typeMap = {
          string: 'string',
          number: 'number',
          integer: 'number',
          boolean: 'boolean',
          array: 'any[]',
          object: 'any',
        };
        return typeMap[yamlType] || 'any';
      },
    },
  };

  // Render template
  if (verbose) {
    context.debug(`Rendering template: ${templatePath}`);
  }

  const output = await templateService.render({
    template: templatePath,
    data: templateData,
    options: {
      cache: true,
      async: true,
    },
  });

  if (dryRun) {
    context.log('Generated output (dry-run):\n', output);
    return;
  }

  // Write output file
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFileName = `${config.name}Service.ts`;
  const outputPath = path.join(outputDir, outputFileName);
  
  fs.writeFileSync(outputPath, output);

  if (verbose) {
    context.debug(`Written to: ${outputPath}`);
  }
}

function getDefaultTemplate(serviceType: string): string {
  const templateDir = path.join(__dirname, 'templates');
  return path.join(templateDir, `service.${serviceType}.ts.ejs`);
}

export default {
  nameSpace: "core",
  name: "ServiceGen",
  version: "1.0.0",
  description: HelpText,
  component: ServiceGenCli,
  domain: Reactory.ComponentDomain.plugin,
  features: [
    {
      feature: "ServiceGen",
      featureType: Reactory.FeatureType.function,
      action: ["generate", "service-generate"],
      stem: "generate",
    },
  ],
  overwrite: false,
  roles: ["USER"],
  stem: "generate",
  tags: ["service", "cli", "generator", "codegen", "ejs"],
  toString(includeVersion) {
    return includeVersion
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : this.name;
  },
} as Reactory.IReactoryComponentDefinition<typeof ServiceGenCli>;
```

## Performance Considerations

1. **Incremental Generation**: Only regenerate changed services
2. **Parallel Processing**: Generate multiple services concurrently
3. **Template Caching**: TemplateService automatically caches compiled EJS templates for improved performance
4. **Watch Mode Optimization**: Efficient file watching with debouncing
5. **Memory Management**: Stream large OpenAPI specs instead of loading entirely
6. **Template Compilation**: Pre-compile frequently used templates on CLI startup

### Template Performance Best Practices

```typescript
// Pre-compile templates at initialization
const templates = {
  rest: await templateService.compileTemplate('./templates/service.rest.ts.ejs'),
  grpc: await templateService.compileTemplate('./templates/service.grpc.ts.ejs'),
  graphql: await templateService.compileTemplate('./templates/service.graphql.ts.ejs'),
  sql: await templateService.compileTemplate('./templates/service.sql.ts.ejs'),
};

// Reuse compiled templates for multiple services
for (const serviceConfig of serviceConfigs) {
  const template = templates[serviceConfig.serviceType];
  const output = await template(serviceConfig);
  // Write output
}
```

## Security Considerations

1. **Path Traversal**: Validate all file paths to prevent traversal attacks
2. **Code Injection**: Sanitize all user input before template rendering
3. **Credential Management**: Never embed secrets in generated code
4. **Dependency Validation**: Verify all dependencies before code generation
5. **File Permissions**: Set appropriate permissions on generated files
6. **Template Security**: EJS auto-escaping prevents injection attacks (use `<%- %>` only for trusted code generation)

## TemplateService Benefits

Using the Reactory TemplateService provides several advantages:

### 1. **Consistency**
- Single templating engine across the entire Reactory platform
- Standardized template syntax and conventions
- Shared template helpers and utilities

### 2. **Performance**
- Built-in template caching reduces file I/O
- Compiled templates execute faster than string parsing
- Async rendering support for non-blocking operations

### 3. **Maintainability**
- Templates are separate from logic (separation of concerns)
- Easy to update templates without changing generator code
- Template versioning and rollback capabilities

### 4. **Extensibility**
- Custom helper functions can be registered globally
- Template partials promote code reuse
- Support for template inheritance

### 5. **Debugging**
- Detailed error messages with line numbers
- Template source maps for debugging
- Integration with Reactory logging

### 6. **Security**
- Auto-escaping prevents injection attacks
- Sandboxed template execution
- Input validation at template level

### Example: Leveraging TemplateService Features

```typescript
// Register global helpers (in service initialization)
templateService.registerHelper('toPascalCase', (str: string) => {
  return str.replace(/(\w)(\w*)/g, (g0, g1, g2) => 
    g1.toUpperCase() + g2.toLowerCase()
  );
});

templateService.registerHelper('toTypeScript', (openApiType: string) => {
  const typeMap = {
    'string': 'string',
    'integer': 'number',
    'boolean': 'boolean',
    'array': 'Array',
    'object': 'object',
  };
  return typeMap[openApiType] || 'any';
});

// Use in template
// <%- helpers.toPascalCase(serviceName) %>
// <%- helpers.toTypeScript(paramType) %>
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-04  
**Author**: Reactory Development Team
