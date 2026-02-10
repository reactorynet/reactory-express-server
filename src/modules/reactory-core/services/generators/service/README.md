# Service Generator

> Generate TypeScript service classes from YAML definitions

## Overview

The Service Generator is a code generation tool that automates the creation of TypeScript service classes for the Reactory platform. It reads YAML service definition files and produces fully-typed, production-ready service implementations with:

- Proper dependency injection
- Error handling with retry logic
- Optional caching support
- Authentication support
- Full TypeScript type safety

## Service ID

```
core.ServiceGenerator@1.0.0
```

## Features

- **Multi-Protocol Support**: Generate services for REST, gRPC, GraphQL, and SQL backends
- **Template-Based**: Uses EJS templates via the Reactory TemplateService
- **Validation**: Validates service definitions before generation
- **Test Generation**: Optionally generates unit tests
- **Documentation**: Optionally generates README documentation
- **Batch Processing**: Generate multiple services from a directory

## Usage

### Programmatic Usage

```typescript
// Get the service
const serviceGenerator = context.getService<IServiceGenerator>('core.ServiceGenerator@1.0.0');

// Generate from YAML file
const result = await serviceGenerator.generateFromFile('./service.yaml', {
  outputDir: './generated',
  overwrite: true,
  generateTests: true,
  generateReadme: true,
});

// Generate from definition object
const result = await serviceGenerator.generate(definition, options);

// Generate multiple services from directory
const results = await serviceGenerator.generateFromDirectory('./services/', options);

// Validate a definition
const validation = serviceGenerator.validate(definition);
```

### CLI Usage

```bash
# Using the reactory executable (after npm install or yarn install)
reactory service-gen -c ./service.yaml -o ./generated

# Or using the bin/cli.sh script directly
bin/cli.sh service-gen -c ./service.yaml -o ./generated

# Generate from directory
reactory service-gen -d ./services/ -o ./generated

# With custom configuration
reactory service-gen -c ./service.yaml -o ./generated --cname=production --cenv=staging

# Dry run (validate only)
reactory service-gen -c ./service.yaml --dry-run
```

## Service Definition Schema

See the [specification document](../../cli/service-gen/docs/specification.md) for the complete YAML schema.

### Minimal Example

```yaml
id: myapp.UserService@1.0.0
name: UserService
nameSpace: myapp
version: 1.0.0
description: Service for managing users
serviceType: rest

dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService

spec:
  rest:
    baseUrl: https://api.example.com/v1
    endpoints:
      - path: /users/{id}
        method: GET
        handler: getUser
        params:
          - name: id
            type: string
            required: true
```

### Complete Example

```yaml
id: myapp.UserService@1.0.0
name: UserService
nameSpace: myapp
version: 1.0.0
description: Service for managing users
serviceType: rest

tags: [users, api]
roles: [USER, ADMIN]

dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService
  - id: core.CacheService@1.0.0
    alias: cacheService
    required: false

authentication:
  type: bearer
  tokenProvider: core.AuthService@1.0.0

caching:
  enabled: true
  ttl: 300
  store: redis

retry:
  enabled: true
  maxAttempts: 3
  backoff: exponential
  initialDelay: 1000

timeout: 30000

spec:
  rest:
    baseUrl: https://api.example.com/v1
    headers:
      Accept: application/json
    endpoints:
      - path: /users
        method: GET

### OpenAPI/Swagger Support

The Service Generator now supports automatic service generation from OpenAPI 3.x and Swagger 2.0 specifications! This allows you to:

- Generate services directly from existing API specifications
- Load specifications from local files or remote URLs
- Automatically create typed service methods from all API endpoints
- Combine spec-generated endpoints with custom endpoints

#### From Local File

```yaml
id: myapp.ApiService@1.0.0
name: ApiService
nameSpace: myapp
version: 1.0.0
description: Service generated from OpenAPI spec
serviceType: rest

dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService

spec:
  swagger: ./swagger.json  # or openapi: ./openapi.yaml
```

#### From URL

```yaml
id: myapp.ApiService@1.0.0
name: ApiService
nameSpace: myapp
version: 1.0.0
description: Service generated from remote OpenAPI spec
serviceType: rest

dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService

spec:
  swagger: https://api.example.com/swagger.json
```

#### Mixed Approach (Spec + Custom Endpoints)

```yaml
id: myapp.ApiService@1.0.0
name: ApiService
nameSpace: myapp
version: 1.0.0
description: Service with both spec-generated and custom endpoints
serviceType: rest

dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService

spec:
  swagger: ./swagger.json
  rest:
    baseUrl: https://api.example.com
    endpoints:
      # This custom endpoint will be added to the spec-generated ones
      - path: /custom
        method: POST
        handler: customEndpoint
```

#### Supported Specifications

- **OpenAPI 3.0.x**: Full support
- **OpenAPI 3.1.x**: Full support  
- **Swagger 2.0**: Full support

#### How It Works

When you provide a `swagger` or `openapi` field in your service definition:

1. The generator loads the specification (from file or URL)
2. Automatically detects the specification version
3. Parses all endpoints, parameters, request/response schemas
4. Converts them to Reactory REST endpoint definitions
5. Generates a typed TypeScript service with methods for each endpoint
6. Merges with any manually defined endpoints

#### Example: Real-World Usage

See the `src/modules/zepz-engineer/services/quotes/loyalty/loyalty-api/` directory for a complete example using the WorldRemit Loyalty API OpenAPI 3.0.1 specification.

```yaml
# service-local.yaml
id: worldremit.LoyaltyApiService@1.0.0
name: LoyaltyAPIService
nameSpace: worldremit
version: 1.0.0
description: Legacy World Remit Api
serviceType: rest

dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService

spec:
  swagger: swagger.json  # References the 800+ line OpenAPI spec
```

This generates a complete service with:
- All 6+ API endpoints automatically typed
- Request/response types from the spec schemas
- Proper parameter handling (path, query, header)
- Authentication configuration
- Full TypeScript intellisense

For more details on OpenAPI/Swagger support, see [swagger/IMPLEMENTATION_SUMMARY.md](./swagger/IMPLEMENTATION_SUMMARY.md).

## Generated Code Structure
        handler: listUsers
        description: List all users
        query:
          - name: page
            type: number
          - name: limit
            type: number
        cache: true
      
      - path: /users/{id}
        method: GET
        handler: getUser
        description: Get user by ID
        params:
          - name: id
            type: string
            required: true
        cache: true
        
      - path: /users
        method: POST
        handler: createUser
        description: Create a new user
        body:
          type: object
          required: true
          properties:
            name: string
            email: string
        authentication: true
```

## Generation Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputDir` | string | `./` | Output directory for generated files |
| `format` | `'ts'` \| `'js'` | `'ts'` | Output format |
| `templatePath` | string | - | Custom template path |
| `overwrite` | boolean | `false` | Overwrite existing files |
| `generateTests` | boolean | `false` | Generate unit tests |
| `generateReadme` | boolean | `false` | Generate README documentation |
| `additionalData` | object | - | Extra data passed to templates |

## Generated Code Structure

```
output/
├── UserService.ts       # Main service implementation
├── __tests__/
│   └── UserService.test.ts  # Unit tests (if enabled)
└── README.md            # Documentation (if enabled)
```

## Templates

Templates are located in `./templates/` and use EJS syntax:

| Template | Purpose |
|----------|---------|
| `service.rest.ts.ejs` | REST service template |
| `service.grpc.ts.ejs` | gRPC service template |
| `service.graphql.ts.ejs` | GraphQL service template |
| `service.sql.ts.ejs` | SQL service template |
| `service.hybrid.ts.ejs` | Hybrid service template |
| `service.test.ts.ejs` | Unit test template |
| `README.md.ejs` | README template |

### Customizing Templates

You can provide custom templates:

```typescript
const result = await serviceGenerator.generateFromFile('./service.yaml', {
  templatePath: './my-custom-template.ejs',
});
```

Or create new templates in the templates directory and reference them in your service definition.

## Validation

The generator validates service definitions before generation:

```typescript
const validation = serviceGenerator.validate(definition);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings);
}
```

### Validation Rules

- All required fields must be present
- Service ID must match `namespace.name@version` format
- Version should follow semantic versioning
- Service type must be valid
- Dependency IDs and aliases are required
- REST endpoints require path, method, and handler

## Dependencies

- `core.TemplateService@1.0.0` - For EJS template rendering

## For AI Agents

### Quick Reference

```typescript
// Service ID
const SERVICE_ID = 'core.ServiceGenerator@1.0.0';

// Get service
const generator = context.getService<IServiceGenerator>(SERVICE_ID);

// Key methods
await generator.generateFromFile(yamlPath, options);
await generator.generate(definition, options);
await generator.generateFromDirectory(dirPath, options);
generator.validate(definition);
await generator.parseDefinition(yamlPath);
```

### Common Tasks

**Generate a REST service:**
```typescript
const result = await generator.generateFromFile('./api-service.yaml', {
  outputDir: './src/services',
  overwrite: true,
  generateTests: true,
});
```

**Validate before generating:**
```typescript
const definition = await generator.parseDefinition('./service.yaml');
const validation = generator.validate(definition);
if (validation.valid) {
  await generator.generate(definition, options);
}
```

**Batch generate:**
```typescript
const results = await generator.generateFromDirectory('./services/', {
  outputDir: './src/generated',
});
results.forEach(r => {
  console.log(`${r.serviceDefinition.name}: ${r.success ? 'OK' : r.error}`);
});
```

## Related Documentation

- [Service Generator CLI Specification](../../cli/service-gen/docs/specification.md)
- [TemplateService Documentation](../../TemplateService/README.md)

---

**Version:** 1.0.0  
**Author:** Reactory Development Team
