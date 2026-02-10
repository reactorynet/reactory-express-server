# OpenAPI/Swagger Support - Quick Reference

## Overview

The ServiceGenerator now supports automatic code generation from OpenAPI 3.x and Swagger 2.0 specifications. This guide provides quick examples and troubleshooting tips.

## Quick Start

### 1. From Local File

```yaml
# service.yaml
id: myapp.ApiService@1.0.0
name: ApiService
nameSpace: myapp
version: 1.0.0
description: API Service from OpenAPI spec
serviceType: rest

dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService

spec:
  swagger: ./swagger.json  # Relative to service.yaml location
```

### 2. From URL

```yaml
spec:
  swagger: https://api.example.com/swagger/v2/swagger.json
```

### 3. Using `openapi` field

```yaml
spec:
  openapi: ./openapi.yaml  # Works the same as swagger
```

## CLI Usage

```bash
# Generate from local spec
reactory service-gen -c service.yaml -o ./generated

# Generate from spec with custom config
reactory service-gen -c service.yaml -o ./generated --overwrite

# Validate without generating
reactory service-gen -c service.yaml --dry-run
```

## Supported Specifications

| Type | Versions | Format | Status |
|------|----------|--------|--------|
| OpenAPI | 3.0.x, 3.1.x | JSON, YAML | ✅ Full support |
| Swagger | 2.0 | JSON, YAML | ✅ Full support |

## Generated Features

From an OpenAPI/Swagger spec, the generator automatically creates:

- ✅ TypeScript service class with `@service` decorator
- ✅ Method for each endpoint (GET, POST, PUT, DELETE, etc.)
- ✅ Typed parameters (path, query, header)
- ✅ Request body types
- ✅ Response types
- ✅ Authentication configuration
- ✅ Retry logic
- ✅ Error handling

## Common Patterns

### Pattern 1: Pure Spec Generation

```yaml
id: api.ServiceName@1.0.0
name: ServiceName
nameSpace: api
version: 1.0.0
description: Generated from OpenAPI spec
serviceType: rest

dependencies:
  - id: core.FetchService@1.0.0
    alias: fetchService

spec:
  swagger: ./swagger.json
```

**Result**: Service with all endpoints from swagger.json

### Pattern 2: Spec + Custom Endpoints

```yaml
spec:
  swagger: ./swagger.json
  rest:
    baseUrl: https://api.custom.com  # Override spec's baseUrl
    endpoints:
      - path: /custom
        method: POST
        handler: customEndpoint
```

**Result**: Service with swagger endpoints + your custom endpoint

### Pattern 3: Spec + Additional Config

```yaml
spec:
  swagger: ./swagger.json

authentication:
  type: bearer
  tokenProvider: core.AuthService@1.0.0

caching:
  enabled: true
  ttl: 300

retry:
  enabled: true
  maxAttempts: 3
```

**Result**: Service with swagger endpoints + your auth, caching, and retry logic

## Endpoint Method Names

The generator creates method names from:

1. **Operation ID** (if present in spec)
   ```json
   {
     "paths": {
       "/users/{id}": {
         "get": {
           "operationId": "getUserById"
         }
       }
     }
   }
   ```
   → Generates: `getUserById()`

2. **Auto-generated from path + method** (if no operation ID)
   - `/users` GET → `getUsers()`
   - `/users` POST → `postUsers()`
   - `/users/{id}` GET → `getUsersById()`
   - `/products/{id}/reviews` GET → `getProductsByidReviews()`

## Real-World Example

The `src/modules/zepz-engineer/services/quotes/loyalty/loyalty-api/` directory contains a complete working example:

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
  swagger: swagger.json  # 800+ line OpenAPI 3.0.1 spec
```

This generates:
- 6+ endpoints (POST /Referral, GET /Referral/{id}, etc.)
- All with proper TypeScript types
- Complete service implementation

## Troubleshooting

### Issue: "Cannot load specification"

**Cause**: File path is wrong or URL is inaccessible

**Solution**:
- For files: Use path relative to the service.yaml location
- For URLs: Ensure the URL is accessible and returns JSON/YAML
- Check file permissions

### Issue: "Invalid specification"

**Cause**: Spec doesn't meet OpenAPI/Swagger standards

**Solution**:
- Validate your spec at https://editor.swagger.io/
- Ensure required fields are present (info, paths, etc.)
- Check that version field is correct ("openapi": "3.0.x" or "swagger": "2.0")

### Issue: "No endpoints generated"

**Cause**: Spec has no paths or all paths filtered out

**Solution**:
- Check that spec.paths exists and has content
- Verify endpoints aren't all deprecated (if includeDeprecated=false)
- Check tag filtering configuration

### Issue: "Generated methods have weird names"

**Cause**: No operationId in spec, auto-generation from path

**Solution**:
- Add operationId to operations in your spec
- Or accept auto-generated names (they work, just may look odd)

## Advanced Usage

### Custom Parsing Options

```typescript
// Programmatic usage with options
import { SwaggerGeneratorFactory } from './swagger';

const parsedSpec = await SwaggerGeneratorFactory.parse(
  { file: './swagger.json' },
  {
    includeDeprecated: false,  // Skip deprecated endpoints
    filterTags: ['Users'],     // Only include User endpoints
    dereference: true,         // Resolve $ref pointers
    baseUrl: 'https://custom.url'  // Override base URL
  }
);
```

### Accessing Parsed Data

```typescript
// Get statistics about the spec
const generator = await SwaggerGeneratorFactory.createGenerator({ 
  file: './swagger.json' 
});

const stats = generator.getStats();
console.log(`${stats.endpointCount} endpoints`);
console.log(`${stats.schemaCount} schemas`);

// Get all tags
const tags = generator.getTags();
```

## Testing

The swagger module includes comprehensive tests:

```bash
# Run all swagger tests
yarn jest --testPathPattern=swagger

# Specific test suites
yarn jest --testPathPattern=SpecParser.test.ts
yarn jest --testPathPattern=OpenAPI3Generator.test.ts
yarn jest --testPathPattern=Swagger2Generator.test.ts
yarn jest --testPathPattern=LoyaltyAPI.integration.test.ts
```

**Test Coverage**: 72 tests, 100% passing ✅

## See Also

- [ServiceGenerator README](../README.md) - Main documentation
- [swagger/IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details
- [swagger/types.ts](./types.ts) - TypeScript type definitions
- [Loyalty API Example](../../../../../zepz-engineer/services/quotes/loyalty/loyalty-api/) - Real-world usage

## FAQ

**Q: Can I use both `swagger` and `openapi` fields?**  
A: No, use one or the other. They're aliases for the same functionality.

**Q: What happens to manually defined endpoints?**  
A: They're merged with spec-generated endpoints. Both will exist in the final service.

**Q: Can I override the base URL from the spec?**  
A: Yes, define `spec.rest.baseUrl` in your YAML.

**Q: Does this work with Swagger UI JSON export?**  
A: Yes! That's a standard OpenAPI/Swagger JSON format.

**Q: Can I filter which endpoints to generate?**  
A: Currently via tags (programmatically). CLI support coming soon.

**Q: Does it support authentication from the spec?**  
A: Yes, it detects security requirements and sets `authentication: true` on endpoints.

**Q: What about response types?**  
A: They're extracted from the spec and used in the generated code. Complex schemas become `Record<string, any>` for now.

## Support

For issues or questions:
1. Check this guide first
2. Review the technical summary at [swagger/IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
3. Check the test files for usage examples
4. Raise an issue with the development team
