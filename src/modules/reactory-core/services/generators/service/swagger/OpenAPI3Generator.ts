import type {
  OpenAPI3Spec,
  ParsedEndpoint,
  ParsedSpec,
  ParsedParameter,
  ParsedRequestBody,
  ParsedResponse,
  SpecParserOptions,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  ReferenceObject,
  OperationObject,
} from './types';
import { SpecParser, SpecUtils } from './SpecParser';

/**
 * OpenAPI 3.x Specification Generator
 * 
 * Parses OpenAPI 3.x specifications and converts them to service endpoint definitions
 */
export class OpenAPI3Generator {
  private spec: OpenAPI3Spec;
  private options: SpecParserOptions;

  constructor(spec: OpenAPI3Spec, options: SpecParserOptions = {}) {
    this.spec = spec;
    this.options = {
      includeDeprecated: true,
      dereference: true,
      ...options,
    };
  }

  /**
   * Parse the OpenAPI 3.0 specification into service endpoint definitions
   */
  parse(): ParsedSpec {
    const endpoints: ParsedEndpoint[] = [];
    const schemas = SpecParser.getSchemas(this.spec);

    // Parse each path
    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem) continue;

      // Process each HTTP method
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;
      
      for (const method of methods) {
        const operation = pathItem[method];
        if (!operation) continue;

        // Skip deprecated endpoints if configured
        if (operation.deprecated && !this.options.includeDeprecated) {
          continue;
        }

        // Filter by tags if specified
        if (this.options.filterTags && this.options.filterTags.length > 0) {
          if (!operation.tags || !operation.tags.some(tag => this.options.filterTags.includes(tag))) {
            continue;
          }
        }

        const endpoint = this.parseOperation(path, method, operation, pathItem.parameters);
        endpoints.push(endpoint);
      }
    }

    return {
      version: 'openapi-3',
      info: this.spec.info,
      baseUrl: this.options.baseUrl || SpecParser.getBaseURL(this.spec),
      endpoints,
      schemas,
      securitySchemes: this.spec.components?.securitySchemes,
    };
  }

  /**
   * Parse a single operation into an endpoint definition
   */
  private parseOperation(
    path: string,
    method: string,
    operation: OperationObject,
    pathParameters?: (ParameterObject | ReferenceObject)[]
  ): ParsedEndpoint {
    // Combine path-level and operation-level parameters
    const allParameters = [
      ...(pathParameters || []),
      ...(operation.parameters || []),
    ];

    const parameters = this.parseParameters(allParameters);
    const requestBody = this.parseRequestBody(operation.requestBody);
    const responses = this.parseResponses(operation.responses);

    // Determine if authentication is required
    const authentication = !!(operation.security || this.spec.security);

    return {
      path,
      method: method.toUpperCase(),
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      tags: operation.tags,
      parameters,
      requestBody,
      responses,
      deprecated: operation.deprecated,
      authentication,
    };
  }

  /**
   * Parse operation parameters
   */
  private parseParameters(params: (ParameterObject | ReferenceObject)[]): ParsedParameter[] {
    const parsed: ParsedParameter[] = [];

    for (const param of params) {
      if ('$ref' in param) {
        // Resolve reference if dereference is enabled
        if (this.options.dereference) {
          const resolved = SpecParser.resolveRef(this.spec, param.$ref);
          if (resolved) {
            parsed.push(this.parseParameter(resolved));
          }
        }
      } else {
        parsed.push(this.parseParameter(param));
      }
    }

    return parsed;
  }

  /**
   * Parse a single parameter
   */
  private parseParameter(param: ParameterObject): ParsedParameter {
    let type = 'any';
    let schema = param.schema;

    if (schema) {
      if ('$ref' in schema) {
        if (this.options.dereference) {
          const resolved = SpecParser.resolveRef(this.spec, schema.$ref);
          if (resolved) {
            schema = resolved as SchemaObject;
            type = this.getTypeFromSchema(schema);
          }
        } else {
          type = SpecUtils.extractSchemaName(schema.$ref);
        }
      } else {
        type = this.getTypeFromSchema(schema as SchemaObject);
      }
    }

    return {
      name: param.name,
      in: param.in as any,
      type,
      required: param.required || false,
      description: param.description,
      schema: schema && !('$ref' in schema) ? schema : undefined,
      default: param.schema && !('$ref' in param.schema) ? param.schema.default : undefined,
      enum: param.schema && !('$ref' in param.schema) ? param.schema.enum : undefined,
    };
  }

  /**
   * Parse request body
   */
  private parseRequestBody(requestBody?: RequestBodyObject | ReferenceObject): ParsedRequestBody | undefined {
    if (!requestBody) return undefined;

    let body: RequestBodyObject;

    if ('$ref' in requestBody) {
      if (!this.options.dereference) return undefined;
      
      const resolved = SpecParser.resolveRef(this.spec, requestBody.$ref);
      if (!resolved) return undefined;
      body = resolved as RequestBodyObject;
    } else {
      body = requestBody;
    }

    // Get the first content type (prefer JSON)
    const contentTypes = Object.keys(body.content);
    const preferredContentType = 
      contentTypes.find(ct => ct.includes('json')) || 
      contentTypes[0];

    if (!preferredContentType) return undefined;

    const mediaType = body.content[preferredContentType];
    let schema = mediaType.schema;

    if (schema && '$ref' in schema) {
      if (this.options.dereference) {
        const resolved = SpecParser.resolveRef(this.spec, schema.$ref);
        if (resolved) {
          schema = resolved as SchemaObject;
        }
      }
    }

    return {
      required: body.required || false,
      contentType: preferredContentType,
      schema: schema && !('$ref' in schema) ? schema : undefined,
      description: body.description,
    };
  }

  /**
   * Parse responses
   */
  private parseResponses(responses: Record<string, ResponseObject | ReferenceObject>): Record<string, ParsedResponse> {
    const parsed: Record<string, ParsedResponse> = {};

    for (const [statusCode, response] of Object.entries(responses)) {
      if ('$ref' in response) {
        if (!this.options.dereference) continue;
        
        const resolved = SpecParser.resolveRef(this.spec, response.$ref);
        if (!resolved) continue;
        
        parsed[statusCode] = this.parseResponse(statusCode, resolved as ResponseObject);
      } else {
        parsed[statusCode] = this.parseResponse(statusCode, response);
      }
    }

    return parsed;
  }

  /**
   * Parse a single response
   */
  private parseResponse(statusCode: string, response: ResponseObject): ParsedResponse {
    let contentType: string | undefined;
    let schema: SchemaObject | undefined;

    if (response.content) {
      const contentTypes = Object.keys(response.content);
      contentType = 
        contentTypes.find(ct => ct.includes('json')) || 
        contentTypes[0];

      if (contentType) {
        const mediaType = response.content[contentType];
        let mediaSchema = mediaType.schema;

        if (mediaSchema) {
          if ('$ref' in mediaSchema) {
            if (this.options.dereference) {
              const resolved = SpecParser.resolveRef(this.spec, mediaSchema.$ref);
              if (resolved) {
                schema = resolved as SchemaObject;
              }
            }
          } else {
            schema = mediaSchema;
          }
        }
      }
    }

    return {
      statusCode,
      description: response.description,
      contentType,
      schema,
    };
  }

  /**
   * Get TypeScript type from schema
   */
  private getTypeFromSchema(schema: SchemaObject): string {
    if (schema.type) {
      return SpecUtils.mapTypeToTypeScript(schema.type, schema.format);
    }

    if (schema.allOf || schema.oneOf || schema.anyOf) {
      return 'any'; // Could be improved to handle union types
    }

    return 'any';
  }

  /**
   * Get all tags from the specification
   */
  getTags(): string[] {
    const tags = new Set<string>();

    for (const pathItem of Object.values(this.spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;
      
      for (const method of methods) {
        const operation = pathItem[method];
        if (operation?.tags) {
          operation.tags.forEach(tag => tags.add(tag));
        }
      }
    }

    return Array.from(tags);
  }

  /**
   * Get statistics about the specification
   */
  getStats() {
    return {
      version: this.spec.openapi,
      title: this.spec.info.title,
      apiVersion: this.spec.info.version,
      endpointCount: SpecParser.countEndpoints(this.spec),
      schemaCount: Object.keys(SpecParser.getSchemas(this.spec)).length,
      tagCount: this.getTags().length,
      serverCount: this.spec.servers?.length || 0,
    };
  }
}
