/**
 * OpenAPI/Swagger Specification Types
 * 
 * This module defines TypeScript types for OpenAPI 3.x and Swagger 2.x specifications
 */

/**
 * OpenAPI/Swagger version detection
 */
export type SpecVersion = 'openapi-3' | 'swagger-2' | 'unknown';

/**
 * Base specification info
 */
export interface SpecInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

/**
 * Common parameter definition
 */
export interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'body' | 'formData';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: SchemaObject | ReferenceObject;
  type?: string; // Swagger 2.0
  format?: string;
  items?: SchemaObject; // For array types
  default?: any;
  enum?: any[];
}

/**
 * Schema object (simplified for common use)
 */
export interface SchemaObject {
  type?: string;
  format?: string;
  items?: SchemaObject | ReferenceObject;
  properties?: Record<string, SchemaObject | ReferenceObject>;
  required?: string[];
  enum?: any[];
  default?: any;
  description?: string;
  $ref?: string;
  allOf?: (SchemaObject | ReferenceObject)[];
  oneOf?: (SchemaObject | ReferenceObject)[];
  anyOf?: (SchemaObject | ReferenceObject)[];
  not?: SchemaObject | ReferenceObject;
  additionalProperties?: boolean | SchemaObject | ReferenceObject;
  nullable?: boolean; // OpenAPI 3.0
  readOnly?: boolean;
  writeOnly?: boolean;
  example?: any;
}

/**
 * Reference object
 */
export interface ReferenceObject {
  $ref: string;
}

/**
 * Request body (OpenAPI 3.0)
 */
export interface RequestBodyObject {
  description?: string;
  content: Record<string, MediaTypeObject>;
  required?: boolean;
}

/**
 * Media type object
 */
export interface MediaTypeObject {
  schema?: SchemaObject | ReferenceObject;
  example?: any;
  examples?: Record<string, any>;
}

/**
 * Response object
 */
export interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>; // OpenAPI 3.0
  schema?: SchemaObject | ReferenceObject; // Swagger 2.0
  headers?: Record<string, any>;
}

/**
 * Operation object (endpoint definition)
 */
export interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: (ParameterObject | ReferenceObject)[];
  requestBody?: RequestBodyObject | ReferenceObject; // OpenAPI 3.0
  responses: Record<string, ResponseObject | ReferenceObject>;
  deprecated?: boolean;
  security?: any[];
  servers?: any[]; // OpenAPI 3.0
  consumes?: string[]; // Swagger 2.0
  produces?: string[]; // Swagger 2.0
}

/**
 * Path item object
 */
export interface PathItemObject {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OperationObject;
  put?: OperationObject;
  post?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  patch?: OperationObject;
  trace?: OperationObject;
  parameters?: (ParameterObject | ReferenceObject)[];
}

/**
 * OpenAPI 3.x specification
 */
export interface OpenAPI3Spec {
  openapi: string; // e.g., "3.0.1"
  info: SpecInfo;
  servers?: Array<{
    url: string;
    description?: string;
    variables?: Record<string, any>;
  }>;
  paths: Record<string, PathItemObject>;
  components?: {
    schemas?: Record<string, SchemaObject | ReferenceObject>;
    responses?: Record<string, ResponseObject | ReferenceObject>;
    parameters?: Record<string, ParameterObject | ReferenceObject>;
    examples?: Record<string, any>;
    requestBodies?: Record<string, RequestBodyObject | ReferenceObject>;
    headers?: Record<string, any>;
    securitySchemes?: Record<string, any>;
    links?: Record<string, any>;
    callbacks?: Record<string, any>;
  };
  security?: any[];
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

/**
 * Swagger 2.0 specification
 */
export interface Swagger2Spec {
  swagger: string; // "2.0"
  info: SpecInfo;
  host?: string;
  basePath?: string;
  schemes?: string[];
  consumes?: string[];
  produces?: string[];
  paths: Record<string, PathItemObject>;
  definitions?: Record<string, SchemaObject>;
  parameters?: Record<string, ParameterObject>;
  responses?: Record<string, ResponseObject>;
  securityDefinitions?: Record<string, any>;
  security?: any[];
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

/**
 * Union type for any spec
 */
export type OpenAPISpec = OpenAPI3Spec | Swagger2Spec;

/**
 * Parsed endpoint information
 */
export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: Record<string, ParsedResponse>;
  deprecated?: boolean;
  authentication?: boolean;
}

/**
 * Parsed parameter
 */
export interface ParsedParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie' | 'body';
  type: string;
  required: boolean;
  description?: string;
  schema?: SchemaObject;
  default?: any;
  enum?: any[];
}

/**
 * Parsed request body
 */
export interface ParsedRequestBody {
  required: boolean;
  contentType: string;
  schema?: SchemaObject;
  description?: string;
}

/**
 * Parsed response
 */
export interface ParsedResponse {
  statusCode: string;
  description: string;
  contentType?: string;
  schema?: SchemaObject;
}

/**
 * Parsed specification result
 */
export interface ParsedSpec {
  version: SpecVersion;
  info: SpecInfo;
  baseUrl?: string;
  endpoints: ParsedEndpoint[];
  schemas: Record<string, SchemaObject>;
  securitySchemes?: Record<string, any>;
}

/**
 * Parser options
 */
export interface SpecParserOptions {
  /**
   * Base URL to use if not specified in spec
   */
  baseUrl?: string;
  
  /**
   * Whether to include deprecated endpoints
   */
  includeDeprecated?: boolean;
  
  /**
   * Filter endpoints by tags
   */
  filterTags?: string[];
  
  /**
   * Dereference $ref pointers
   */
  dereference?: boolean;
}

/**
 * Spec source configuration
 */
export interface SpecSource {
  /**
   * File path to specification
   */
  file?: string;
  
  /**
   * URL to specification
   */
  url?: string;
  
  /**
   * Inline specification object
   */
  spec?: OpenAPISpec;
}
