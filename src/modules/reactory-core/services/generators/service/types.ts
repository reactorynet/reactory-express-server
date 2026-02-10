import Reactory from '@reactory/reactory-core';

/**
 * Service types supported by the generator
 */
export type ServiceType = 'rest' | 'grpc' | 'graphql' | 'sql' | 'hybrid';

/**
 * HTTP methods for REST endpoints
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * Authentication types supported
 */
export type AuthenticationType = 'none' | 'basic' | 'bearer' | 'apiKey' | 'oauth2' | 'custom';

/**
 * Streaming modes for gRPC
 */
export type GrpcStreamingMode = 'none' | 'client' | 'server' | 'bidirectional';

/**
 * GraphQL operation types
 */
export type GraphQLOperationType = 'query' | 'mutation' | 'subscription';

/**
 * SQL return types
 */
export type SqlReturnType = 'single' | 'many' | 'scalar' | 'void';

/**
 * Service definition as loaded from YAML
 */
export interface ServiceDefinition {
  /** Fully qualified service ID (namespace.name@version) */
  id: string;
  /** Service name */
  name: string;
  /** Service namespace */
  nameSpace: string;
  /** Semantic version */
  version: string;
  /** Service description */
  description: string;
  /** Service type */
  serviceType: ServiceType;
  /** Service dependencies */
  dependencies?: ServiceDependency[];
  /** Tags for categorization */
  tags?: string[];
  /** Required roles for access */
  roles?: string[];
  /** Protocol-specific specifications */
  spec?: ServiceSpec;
  /** Authentication configuration */
  authentication?: AuthenticationConfig;
  /** Caching configuration */
  caching?: CachingConfig;
  /** Retry policy configuration */
  retry?: RetryConfig;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
}

/**
 * Service dependency definition
 */
export interface ServiceDependency {
  /** Service ID (e.g., "core.FetchService@1.0.0") */
  id: string;
  /** Alias for accessing the service */
  alias: string;
  /** Whether dependency is required (default: true) */
  required?: boolean;
  /** Lazy loading (default: false) */
  lazy?: boolean;
}

/**
 * Service specification containing protocol-specific configurations
 */
export interface ServiceSpec {
  /** OpenAPI specification URL or path */
  openapi?: string;
  /** Swagger specification URL or path */
  swagger?: string;
  /** REST API configuration */
  rest?: RestSpec;
  /** gRPC configuration */
  grpc?: GrpcSpec;
  /** GraphQL configuration */
  graphql?: GraphQLSpec;
  /** SQL configuration */
  sql?: SqlSpec;
}

/**
 * REST API specification
 */
export interface RestSpec {
  /** Base URL for the API */
  baseUrl: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** REST endpoints */
  endpoints: RestEndpoint[];
}

/**
 * REST endpoint definition
 */
export interface RestEndpoint {
  /** Endpoint path (can include path parameters like {id}) */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** Handler method name in generated class */
  handler: string;
  /** Endpoint description */
  description?: string;
  /** Path parameters */
  params?: ParameterDefinition[];
  /** Query parameters */
  query?: ParameterDefinition[];
  /** Request body schema */
  body?: SchemaDefinition;
  /** Response schema */
  response?: SchemaDefinition;
  /** Whether endpoint requires authentication */
  authentication?: boolean;
  /** Whether to cache responses */
  cache?: boolean;
  /** Endpoint-specific timeout override */
  timeout?: number;
}

/**
 * gRPC specification
 */
export interface GrpcSpec {
  /** Path to .proto file */
  protoPath: string;
  /** Service name in proto file */
  serviceName: string;
  /** Package name */
  packageName?: string;
  /** gRPC endpoints */
  endpoints: GrpcEndpoint[];
}

/**
 * gRPC endpoint definition
 */
export interface GrpcEndpoint {
  /** RPC method name */
  rpc: string;
  /** Handler method name in generated class */
  handler: string;
  /** Method description */
  description?: string;
  /** Streaming mode */
  streaming?: GrpcStreamingMode;
  /** Endpoint-specific timeout */
  timeout?: number;
}

/**
 * GraphQL specification
 */
export interface GraphQLSpec {
  /** GraphQL endpoint URL */
  endpoint: string;
  /** GraphQL operations */
  operations: GraphQLOperation[];
}

/**
 * GraphQL operation definition
 */
export interface GraphQLOperation {
  /** Operation type */
  type: GraphQLOperationType;
  /** Operation name */
  name: string;
  /** Handler method name in generated class */
  handler: string;
  /** Operation description */
  description?: string;
  /** GraphQL query/mutation/subscription string */
  query: string;
  /** Variable definitions */
  variables?: Record<string, SchemaDefinition>;
  /** Whether to cache responses */
  cache?: boolean;
}

/**
 * SQL specification
 */
export interface SqlSpec {
  /** Data source identifier */
  dataSource: string;
  /** SQL queries */
  queries: SqlQuery[];
}

/**
 * SQL query definition
 */
export interface SqlQuery {
  /** Query identifier */
  name: string;
  /** Handler method name in generated class */
  handler: string;
  /** Query description */
  description?: string;
  /** SQL query string (can use named parameters like :param) */
  query: string;
  /** Parameter definitions */
  params?: ParameterDefinition[];
  /** Return type */
  returnType?: SqlReturnType;
  /** Run in transaction */
  transaction?: boolean;
}

/**
 * Parameter definition for endpoints
 */
export interface ParameterDefinition {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Whether parameter is required */
  required?: boolean;
  /** Default value */
  default?: any;
  /** Parameter description */
  description?: string;
}

/**
 * Schema definition for request/response bodies
 */
export interface SchemaDefinition {
  /** Schema type */
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  /** Whether schema is required */
  required?: boolean;
  /** Object properties (for type: 'object') */
  properties?: Record<string, SchemaDefinition | string>;
  /** Array item schema (for type: 'array') */
  items?: SchemaDefinition | string;
  /** Description */
  description?: string;
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  /** Authentication type */
  type: AuthenticationType;
  /** Basic auth credentials */
  credentials?: {
    username: string;
    password: string;
  };
  /** Bearer token */
  token?: string;
  /** Token provider service ID */
  tokenProvider?: string;
  /** API key */
  apiKey?: string;
  /** API key header name */
  apiKeyHeader?: string;
  /** OAuth2 configuration */
  oauth2?: {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    scopes?: string[];
  };
  /** Custom auth provider service ID */
  custom?: {
    provider: string;
  };
}

/**
 * Caching configuration
 */
export interface CachingConfig {
  /** Enable caching */
  enabled: boolean;
  /** Time to live in seconds */
  ttl?: number;
  /** Cache key pattern template */
  keyPattern?: string;
  /** Events that invalidate cache */
  invalidateOn?: string[];
  /** Cache store type */
  store?: 'memory' | 'redis' | 'custom';
}

/**
 * Retry policy configuration
 */
export interface RetryConfig {
  /** Enable retry */
  enabled: boolean;
  /** Maximum retry attempts */
  maxAttempts?: number;
  /** Backoff strategy */
  backoff?: 'fixed' | 'exponential' | 'linear';
  /** Initial delay in ms */
  initialDelay?: number;
  /** Maximum delay in ms */
  maxDelay?: number;
  /** Error codes to retry on */
  retryOn?: (number | string)[];
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Enable rate limiting */
  enabled: boolean;
  /** Maximum requests */
  maxRequests?: number;
  /** Time window in seconds */
  window?: number;
  /** Rate limit strategy */
  strategy?: 'sliding' | 'fixed';
  /** Scope of rate limiting */
  scope?: 'global' | 'user' | 'ip';
}

/**
 * Service generation options
 */
export interface ServiceGenerationOptions {
  /** Output directory for generated files */
  outputDir?: string;
  /** Output format */
  format?: 'ts' | 'js';
  /** Custom template path */
  templatePath?: string;
  /** Overwrite existing files */
  overwrite?: boolean;
  /** Generate tests */
  generateTests?: boolean;
  /** Generate README */
  generateReadme?: boolean;
  /** Additional data to pass to templates */
  additionalData?: Record<string, any>;
}

/**
 * Result of service generation
 */
export interface ServiceGenerationResult {
  /** Whether generation was successful */
  success: boolean;
  /** Generated file paths */
  files: string[];
  /** Any warnings during generation */
  warnings: string[];
  /** Error message if generation failed */
  error?: string;
  /** Service definition that was generated */
  serviceDefinition: ServiceDefinition;
}

/**
 * Template data passed to EJS templates
 */
export interface ServiceTemplateData extends ServiceDefinition {
  /** Class name for the generated service */
  className: string;
  /** Generation timestamp */
  generatedDate: string;
  /** Source file path */
  sourceFile: string;
  /** Helper functions */
  helpers: Record<string, (...args: any[]) => any>;
  /** Additional custom data */
  custom?: Record<string, any>;
}

/**
 * Service generator interface
 */
export interface IServiceGenerator extends Reactory.Service.IReactoryService {
  /**
   * Generate a service from a YAML definition file
   */
  generateFromFile(
    configPath: string,
    options?: ServiceGenerationOptions
  ): Promise<ServiceGenerationResult>;

  /**
   * Generate a service from a ServiceDefinition object
   */
  generate(
    definition: ServiceDefinition,
    options?: ServiceGenerationOptions
  ): Promise<ServiceGenerationResult>;

  /**
   * Generate multiple services from a directory
   */
  generateFromDirectory(
    directoryPath: string,
    options?: ServiceGenerationOptions
  ): Promise<ServiceGenerationResult[]>;

  /**
   * Validate a service definition
   */
  validate(definition: ServiceDefinition): ValidationResult;

  /**
   * Parse a YAML service definition file
   */
  parseDefinition(configPath: string): Promise<ServiceDefinition>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the definition is valid */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field path where error occurred */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field path where warning occurred */
  path: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
}
