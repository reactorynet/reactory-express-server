import Reactory from '@reactory/reactory-core';
import { service } from '@reactory/server-core/application/decorators';
import { roles } from '@reactory/server-core/authentication/decorators';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  ServiceDefinition,
  ServiceGenerationOptions,
  ServiceGenerationResult,
  ServiceTemplateData,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  IServiceGenerator,
  RestEndpoint,
} from './types';
import { IEnhancedTemplateService } from '../../TemplateService/types';
import { SwaggerGeneratorFactory, ParsedSpec, ParsedEndpoint } from './swagger';

type ServiceGeneratorContext = Reactory.Server.IReactoryContext;
type ServiceGeneratorProps = Reactory.Service.IReactoryServiceProps;

/**
 * Default templates directory
 */
const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Required fields in a service definition
 */
const REQUIRED_FIELDS = ['id', 'name', 'nameSpace', 'version', 'serviceType'];

/**
 * Valid service types
 */
const VALID_SERVICE_TYPES = ['rest', 'grpc', 'graphql', 'sql', 'hybrid'];

@service({
  id: 'core.ServiceGenerator@1.0.0',
  nameSpace: 'core',
  name: 'ServiceGenerator',
  version: '1.0.0',
  description: 'Generates TypeScript service classes from YAML definitions',
  serviceType: 'codeGeneration',
  secondaryTypes: ['development', 'build'],
  dependencies: [
    { id: 'core.TemplateService@1.0.0', alias: 'templateService' },
  ],
  features: [
    {
      feature: 'generateService',
      featureType: 'function',
      description: 'Generate a TypeScript service from YAML definition',
      action: ['generate', 'service-generate'],
      stem: 'generate',
    },
  ],
})
class ServiceGenerator implements IServiceGenerator {
  name: string = 'ServiceGenerator';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  private context: ServiceGeneratorContext;
  private readonly props: ServiceGeneratorProps;
  private readonly templateService: IEnhancedTemplateService;

  constructor(props: ServiceGeneratorProps, context: ServiceGeneratorContext) {
    this.props = props;
    this.context = context;
    this.templateService = (props.dependencies as any)?.templateService;
  }

  /**
   * Generate a service from a YAML definition file
   */
  async generateFromFile(
    configPath: string,
    options: ServiceGenerationOptions = {}
  ): Promise<ServiceGenerationResult> {
    try {
      // Parse the definition
      const definition = await this.parseDefinition(configPath);

      // Add source file info
      const result = await this.generate(definition, {
        ...options,
        additionalData: {
          ...options.additionalData,
          sourceFile: configPath,
        },
      });

      return result;
    } catch (error: any) {
      return {
        success: false,
        files: [],
        warnings: [],
        error: `Failed to generate from file: ${error.message}`,
        serviceDefinition: null as any,
      };
    }
  }

  /**
   * Generate a service from a ServiceDefinition object
   */
  async generate(
    definition: ServiceDefinition,
    options: ServiceGenerationOptions = {}
  ): Promise<ServiceGenerationResult> {
    const warnings: string[] = [];
    const files: string[] = [];

    try {
      // Check if definition uses OpenAPI/Swagger spec
      if (definition.spec?.swagger || definition.spec?.openapi) {
        return await this.generateFromSwagger(definition, options);
      }

      // Check if definition uses gRPC and compile proto first
      if (definition.serviceType === 'grpc' && definition.spec?.grpc) {
        const protocResult = await this.compileProtoFile(definition, options);
        warnings.push(...protocResult.warnings);
        files.push(...protocResult.files);
        
        if (!protocResult.success) {
          return {
            success: false,
            files,
            warnings,
            error: protocResult.error || 'Failed to compile proto file',
            serviceDefinition: definition,
          };
        }
      }

      // Validate the definition
      const validation = this.validate(definition);
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join('; ');
        return {
          success: false,
          files: [],
          warnings: validation.warnings.map(w => `${w.path}: ${w.message}`),
          error: `Validation failed: ${errorMessages}`,
          serviceDefinition: definition,
        };
      }

      // Add warnings from validation
      warnings.push(...validation.warnings.map(w => `${w.path}: ${w.message}`));

      // Prepare template data
      const templateData = this.prepareTemplateData(definition, options);

      // Determine output directory
      const outputDir = options.outputDir || process.cwd();

      // Select template based on service type
      const templatePath = options.templatePath || this.getDefaultTemplate(definition.serviceType);

      // Ensure template service is available
      if (!this.templateService) {
        throw new Error('TemplateService not available. Please check service dependencies.');
      }

      // Add template directory
      this.templateService.addTemplateDirectory(TEMPLATES_DIR, 100);

      // Render the main service file
      const serviceCode = await this.templateService.renderFile(templatePath, templateData);

      // Write the service file
      const outputFileName = `${definition.name}.ts`;
      const outputPath = path.join(outputDir, outputFileName);

      if (fs.existsSync(outputPath) && !options.overwrite) {
        warnings.push(`File already exists and overwrite is disabled: ${outputPath}`);
      } else {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, serviceCode, 'utf8');
        files.push(outputPath);
        this.context.log(`Generated service: ${outputPath}`);
      }

      // Generate tests if requested
      if (options.generateTests) {
        const testResult = await this.generateTests(definition, templateData, outputDir);
        files.push(...testResult.files);
        warnings.push(...testResult.warnings);
      }

      // Generate README if requested
      if (options.generateReadme) {
        const readmeResult = await this.generateReadme(definition, templateData, outputDir);
        files.push(...readmeResult.files);
        warnings.push(...readmeResult.warnings);
      }

      return {
        success: true,
        files,
        warnings,
        serviceDefinition: definition,
      };
    } catch (error: any) {
      this.context.error('Service generation failed', { error, definition });
      return {
        success: false,
        files,
        warnings,
        error: error.message,
        serviceDefinition: definition,
      };
    }
  }

  /**
   * Generate a service from OpenAPI/Swagger specification
   * @private
   */
  private async generateFromSwagger(
    definition: ServiceDefinition,
    options: ServiceGenerationOptions = {}
  ): Promise<ServiceGenerationResult> {
    const warnings: string[] = [];
    const files: string[] = [];

    try {
      this.context.log(`Generating service from OpenAPI/Swagger specification`);

      // Get the swagger/openapi source
      const swaggerSource = definition.spec?.swagger || definition.spec?.openapi;
      if (!swaggerSource) {
        throw new Error('No swagger or openapi specification provided');
      }

      // Determine if it's a URL or file path
      const isUrl = swaggerSource.startsWith('http://') || swaggerSource.startsWith('https://');
      
      // Parse the specification
      let parsedSpec: ParsedSpec;
      
      if (isUrl) {
        this.context.log(`Loading specification from URL: ${swaggerSource}`);
        parsedSpec = await SwaggerGeneratorFactory.parse({ url: swaggerSource });
      } else {
        // Resolve relative to the definition file location if provided
        let specPath = swaggerSource;
        if (options.additionalData?.sourceFile) {
          const sourceDir = path.dirname(options.additionalData.sourceFile);
          specPath = path.resolve(sourceDir, swaggerSource);
        } else {
          specPath = path.resolve(swaggerSource);
        }

        this.context.log(`Loading specification from file: ${specPath}`);
        parsedSpec = await SwaggerGeneratorFactory.parse({ file: specPath });
      }

      this.context.log(`Parsed ${parsedSpec.version} specification: ${parsedSpec.info.title}`);
      this.context.log(`Found ${parsedSpec.endpoints.length} endpoints`);

      // Convert parsed endpoints to REST endpoints
      const restEndpoints: RestEndpoint[] = parsedSpec.endpoints.map(endpoint => 
        this.convertParsedEndpointToRestEndpoint(endpoint)
      );

      // Merge swagger-generated endpoints with any manually defined endpoints
      if (definition.spec?.rest?.endpoints) {
        restEndpoints.push(...definition.spec.rest.endpoints);
        warnings.push(`Merged ${definition.spec.rest.endpoints.length} manually defined endpoints with ${parsedSpec.endpoints.length} spec-generated endpoints`);
      }

      // Update the definition with generated endpoints
      const enhancedDefinition: ServiceDefinition = {
        ...definition,
        spec: {
          ...definition.spec,
          rest: {
            baseUrl: parsedSpec.baseUrl || definition.spec?.rest?.baseUrl || '',
            headers: definition.spec?.rest?.headers || {},
            endpoints: restEndpoints,
          },
        },
      };

      // Use the regular generate flow with the enhanced definition
      return await this.generateFromEnhancedDefinition(enhancedDefinition, options, warnings);
    } catch (error: any) {
      this.context.error('Swagger service generation failed', { error, definition });
      return {
        success: false,
        files,
        warnings,
        error: `Swagger generation failed: ${error.message}`,
        serviceDefinition: definition,
      };
    }
  }

  /**
   * Convert parsed swagger endpoint to REST endpoint definition
   * @private
   */
  private convertParsedEndpointToRestEndpoint(endpoint: ParsedEndpoint): RestEndpoint {
    // Generate handler name from operationId or path+method
    const handler = endpoint.operationId || this.generateHandlerName(endpoint.path, endpoint.method);

    // Convert parameters
    const pathParams = endpoint.parameters
      .filter(p => p.in === 'path')
      .map(p => ({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
      }));

    const queryParams = endpoint.parameters
      .filter(p => p.in === 'query')
      .map(p => ({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
        default: p.default,
        enum: p.enum,
      }));

    const headerParams = endpoint.parameters
      .filter(p => p.in === 'header')
      .map(p => ({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
      }));

    // Convert request body
    const body = endpoint.requestBody ? {
      type: 'object', // Will be refined by schema
      required: endpoint.requestBody.required,
      description: endpoint.requestBody.description,
      contentType: endpoint.requestBody.contentType,
    } : undefined;

    // Convert responses
    const response = endpoint.responses['200'] || endpoint.responses['201'] || Object.values(endpoint.responses)[0];

    const restEndpoint: RestEndpoint = {
      path: endpoint.path,
      method: endpoint.method as any,
      handler,
      description: endpoint.description || endpoint.summary,
    };

    if (pathParams.length > 0) restEndpoint.params = pathParams;
    if (queryParams.length > 0) restEndpoint.query = queryParams;
    if (headerParams.length > 0) restEndpoint.headers = headerParams;
    if (body) restEndpoint.body = body as any;
    if (response?.schema) {
      restEndpoint.response = {
        type: response.schema.type || 'object',
        properties: response.schema.properties as any,
      };
    }
    if (endpoint.authentication) restEndpoint.authentication = true;
    if (endpoint.deprecated) restEndpoint.deprecated = true;
    if (endpoint.tags && endpoint.tags.length > 0) restEndpoint.tags = endpoint.tags;

    return restEndpoint;
  }

  /**
   * Generate handler name from path and method
   * @private
   */
  private generateHandlerName(path: string, method: string): string {
    const pathParts = path
      .split('/')
      .filter(Boolean)
      .map(part => {
        if (part.startsWith('{') && part.endsWith('}')) {
          return 'By' + this.capitalize(part.slice(1, -1));
        }
        return this.capitalize(part);
      });

    const methodName = method.toLowerCase();
    const resourceName = pathParts.join('');

    return `${methodName}${resourceName}`;
  }

  /**
   * Capitalize first letter
   * @private
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate service from enhanced definition (after swagger processing)
   * @private
   */
  private async generateFromEnhancedDefinition(
    definition: ServiceDefinition,
    options: ServiceGenerationOptions,
    existingWarnings: string[]
  ): Promise<ServiceGenerationResult> {
    const warnings = [...existingWarnings];
    const files: string[] = [];

    try {
      // Prepare template data
      const templateData = this.prepareTemplateData(definition, options);

      // Determine output directory
      const outputDir = options.outputDir || process.cwd();

      // Select template
      const templatePath = options.templatePath || this.getDefaultTemplate(definition.serviceType);

      // Ensure template service is available
      if (!this.templateService) {
        throw new Error('TemplateService not available');
      }

      // Add template directory
      this.templateService.addTemplateDirectory(TEMPLATES_DIR, 100);

      // Render the main service file
      const serviceCode = await this.templateService.renderFile(templatePath, templateData);

      // Write the service file
      const outputFileName = `${definition.name}.ts`;
      const outputPath = path.join(outputDir, outputFileName);

      if (fs.existsSync(outputPath) && !options.overwrite) {
        warnings.push(`File already exists and overwrite is disabled: ${outputPath}`);
      } else {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, serviceCode, 'utf8');
        files.push(outputPath);
        this.context.log(`Generated service: ${outputPath}`);
      }

      // Generate tests if requested
      if (options.generateTests) {
        const testResult = await this.generateTests(definition, templateData, outputDir);
        files.push(...testResult.files);
        warnings.push(...testResult.warnings);
      }

      // Generate README if requested
      if (options.generateReadme) {
        const readmeResult = await this.generateReadme(definition, templateData, outputDir);
        files.push(...readmeResult.files);
        warnings.push(...readmeResult.warnings);
      }

      return {
        success: true,
        files,
        warnings,
        serviceDefinition: definition,
      };
    } catch (error: any) {
      return {
        success: false,
        files,
        warnings,
        error: error.message,
        serviceDefinition: definition,
      };
    }
  }

  /**
   * Generate multiple services from a directory
   */
  async generateFromDirectory(
    directoryPath: string,
    options: ServiceGenerationOptions = {}
  ): Promise<ServiceGenerationResult[]> {
    const results: ServiceGenerationResult[] = [];

    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory not found: ${directoryPath}`);
    }

    const findYamlFiles = (dir: string): string[] => {
      const files: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...findYamlFiles(fullPath));
        } else if (entry.name === 'service.yaml' || entry.name === 'service.yml') {
          files.push(fullPath);
        }
      }

      return files;
    };

    const yamlFiles = findYamlFiles(directoryPath);
    this.context.log(`Found ${yamlFiles.length} service definition(s) in ${directoryPath}`);

    for (const yamlFile of yamlFiles) {
      const result = await this.generateFromFile(yamlFile, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a service definition
   */
  validate(definition: ServiceDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!(definition as any)[field]) {
        errors.push({
          path: field,
          message: `Required field "${field}" is missing`,
          code: 'REQUIRED_FIELD_MISSING',
        });
      }
    }

    // Validate service type
    if (definition.serviceType && !VALID_SERVICE_TYPES.includes(definition.serviceType)) {
      errors.push({
        path: 'serviceType',
        message: `Invalid service type "${definition.serviceType}". Must be one of: ${VALID_SERVICE_TYPES.join(', ')}`,
        code: 'INVALID_SERVICE_TYPE',
      });
    }

    // Validate ID format (should match namespace.name@version)
    if (definition.id) {
      const expectedId = `${definition.nameSpace}.${definition.name}@${definition.version}`;
      if (definition.id !== expectedId) {
        warnings.push({
          path: 'id',
          message: `ID "${definition.id}" does not match expected format "${expectedId}"`,
          code: 'ID_FORMAT_MISMATCH',
        });
      }
    }

    // Validate version format
    if (definition.version && !/^\d+\.\d+\.\d+/.test(definition.version)) {
      warnings.push({
        path: 'version',
        message: 'Version should follow semantic versioning (e.g., 1.0.0)',
        code: 'INVALID_VERSION_FORMAT',
      });
    }

    // Validate spec based on service type
    if (definition.spec) {
      this.validateSpec(definition, errors, warnings);
    } else if (definition.serviceType !== 'hybrid') {
      warnings.push({
        path: 'spec',
        message: 'No specification provided. Service will have minimal functionality.',
        code: 'NO_SPEC',
      });
    }

    // Validate dependencies
    if (definition.dependencies) {
      for (let i = 0; i < definition.dependencies.length; i++) {
        const dep = definition.dependencies[i];
        if (!dep.id) {
          errors.push({
            path: `dependencies[${i}].id`,
            message: 'Dependency ID is required',
            code: 'DEPENDENCY_ID_MISSING',
          });
        }
        if (!dep.alias) {
          errors.push({
            path: `dependencies[${i}].alias`,
            message: 'Dependency alias is required',
            code: 'DEPENDENCY_ALIAS_MISSING',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate spec section based on service type
   */
  private validateSpec(
    definition: ServiceDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { spec, serviceType } = definition;

    // REST validation
    if ((serviceType === 'rest' || serviceType === 'hybrid') && spec?.rest) {
      if (!spec.rest.baseUrl) {
        errors.push({
          path: 'spec.rest.baseUrl',
          message: 'REST specification requires a baseUrl',
          code: 'REST_BASEURL_MISSING',
        });
      }
      if (!spec.rest.endpoints || spec.rest.endpoints.length === 0) {
        warnings.push({
          path: 'spec.rest.endpoints',
          message: 'No REST endpoints defined',
          code: 'NO_REST_ENDPOINTS',
        });
      } else {
        spec.rest.endpoints.forEach((endpoint, i) => {
          if (!endpoint.path) {
            errors.push({
              path: `spec.rest.endpoints[${i}].path`,
              message: 'Endpoint path is required',
              code: 'ENDPOINT_PATH_MISSING',
            });
          }
          if (!endpoint.method) {
            errors.push({
              path: `spec.rest.endpoints[${i}].method`,
              message: 'Endpoint method is required',
              code: 'ENDPOINT_METHOD_MISSING',
            });
          }
          if (!endpoint.handler) {
            errors.push({
              path: `spec.rest.endpoints[${i}].handler`,
              message: 'Endpoint handler is required',
              code: 'ENDPOINT_HANDLER_MISSING',
            });
          }
        });
      }
    }

    // gRPC validation
    if ((serviceType === 'grpc' || serviceType === 'hybrid') && spec?.grpc) {
      if (!spec.grpc.protoPath) {
        errors.push({
          path: 'spec.grpc.protoPath',
          message: 'gRPC specification requires a protoPath',
          code: 'GRPC_PROTOPATH_MISSING',
        });
      }
      if (!spec.grpc.serviceName) {
        errors.push({
          path: 'spec.grpc.serviceName',
          message: 'gRPC specification requires a serviceName',
          code: 'GRPC_SERVICENAME_MISSING',
        });
      }
    }

    // GraphQL validation
    if ((serviceType === 'graphql' || serviceType === 'hybrid') && spec?.graphql) {
      if (!spec.graphql.endpoint) {
        errors.push({
          path: 'spec.graphql.endpoint',
          message: 'GraphQL specification requires an endpoint',
          code: 'GRAPHQL_ENDPOINT_MISSING',
        });
      }
    }

    // SQL validation
    if ((serviceType === 'sql' || serviceType === 'hybrid') && spec?.sql) {
      if (!spec.sql.dataSource) {
        errors.push({
          path: 'spec.sql.dataSource',
          message: 'SQL specification requires a dataSource',
          code: 'SQL_DATASOURCE_MISSING',
        });
      }
    }
  }

  /**
   * Parse a YAML service definition file
   */
  async parseDefinition(configPath: string): Promise<ServiceDefinition> {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Service definition file not found: ${configPath}`);
    }

    const content = fs.readFileSync(configPath, 'utf8');
    const definition = yaml.load(content) as ServiceDefinition;

    if (!definition) {
      throw new Error(`Failed to parse service definition: ${configPath}`);
    }

    return definition;
  }

  /**
   * Prepare template data for rendering
   */
  private prepareTemplateData(
    definition: ServiceDefinition,
    options: ServiceGenerationOptions
  ): ServiceTemplateData {
    // Generate class name from service name
    const className = this.generateClassName(definition.name);

    // For gRPC services, add serviceName to root level if not present
    const enhancedDefinition = { ...definition };
    if (definition.serviceType === 'grpc' && definition.spec?.grpc) {
      if (!(enhancedDefinition as any).serviceName && definition.spec.grpc.serviceName) {
        (enhancedDefinition as any).serviceName = definition.spec.grpc.serviceName;
      }
    }

    return {
      ...enhancedDefinition,
      className,
      generatedDate: new Date().toISOString(),
      sourceFile: options.additionalData?.sourceFile || 'unknown',
      helpers: this.templateService?.getHelpers() || {},
      custom: options.additionalData,
    };
  }

  /**
   * Generate a valid TypeScript class name
   */
  private generateClassName(name: string): string {
    // Remove any non-alphanumeric characters and convert to PascalCase
    return name
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Get the default template for a service type
   */
  private getDefaultTemplate(serviceType: string): string {
    const templateMap: Record<string, string> = {
      rest: 'service.rest.ts.ejs',
      grpc: 'service.grpc.ts.ejs',
      graphql: 'service.graphql.ts.ejs',
      sql: 'service.sql.ts.ejs',
      hybrid: 'service.hybrid.ts.ejs',
    };

    return templateMap[serviceType] || 'service.rest.ts.ejs';
  }

  /**
   * Generate test files for a service
   */
  private async generateTests(
    definition: ServiceDefinition,
    templateData: ServiceTemplateData,
    outputDir: string
  ): Promise<{ files: string[]; warnings: string[] }> {
    const files: string[] = [];
    const warnings: string[] = [];

    try {
      const testTemplatePath = path.join(TEMPLATES_DIR, 'service.test.ts.ejs');
      
      if (!fs.existsSync(testTemplatePath)) {
        warnings.push('Test template not found. Skipping test generation.');
        return { files, warnings };
      }

      const testCode = await this.templateService.renderFile(testTemplatePath, templateData);
      const testDir = path.join(outputDir, '__tests__');
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const testFilePath = path.join(testDir, `${definition.name}.test.ts`);
      fs.writeFileSync(testFilePath, testCode, 'utf8');
      files.push(testFilePath);
      
      this.context.log(`Generated tests: ${testFilePath}`);
    } catch (error: any) {
      warnings.push(`Failed to generate tests: ${error.message}`);
    }

    return { files, warnings };
  }

  /**
   * Generate README file for a service
   */
  private async generateReadme(
    definition: ServiceDefinition,
    templateData: ServiceTemplateData,
    outputDir: string
  ): Promise<{ files: string[]; warnings: string[] }> {
    const files: string[] = [];
    const warnings: string[] = [];

    try {
      const readmeTemplatePath = path.join(TEMPLATES_DIR, 'README.md.ejs');
      
      if (!fs.existsSync(readmeTemplatePath)) {
        warnings.push('README template not found. Skipping README generation.');
        return { files, warnings };
      }

      const readmeContent = await this.templateService.renderFile(readmeTemplatePath, templateData);
      const readmeFilePath = path.join(outputDir, 'README.md');
      
      fs.writeFileSync(readmeFilePath, readmeContent, 'utf8');
      files.push(readmeFilePath);
      
      this.context.log(`Generated README: ${readmeFilePath}`);
    } catch (error: any) {
      warnings.push(`Failed to generate README: ${error.message}`);
    }

    return { files, warnings };
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  /**
   * Compile .proto file using protoc compiler
   * Generates TypeScript client code from proto definitions
   * @private
   */
  private async compileProtoFile(
    definition: ServiceDefinition,
    options: ServiceGenerationOptions
  ): Promise<{ success: boolean; files: string[]; warnings: string[]; error?: string }> {
    const warnings: string[] = [];
    const files: string[] = [];

    try {
      if (!definition.spec?.grpc) {
        return { success: false, files, warnings, error: 'No gRPC specification provided' };
      }

      const grpcSpec = definition.spec.grpc;
      const protoPath = grpcSpec.protoPath;

      // Resolve proto file path
      let resolvedProtoPath: string;
      if (options.additionalData?.sourceFile) {
        const sourceDir = path.dirname(options.additionalData.sourceFile);
        resolvedProtoPath = path.resolve(sourceDir, protoPath);
      } else {
        resolvedProtoPath = path.resolve(protoPath);
      }

      if (!fs.existsSync(resolvedProtoPath)) {
        return { 
          success: false, 
          files, 
          warnings, 
          error: `Proto file not found: ${resolvedProtoPath}` 
        };
      }

      // Determine output directory
      const outputDir = options.outputDir || process.cwd();
      const generatedDir = path.join(outputDir, 'generated');

      // Ensure generated directory exists
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }

      this.context.log(`Compiling proto file: ${resolvedProtoPath}`);
      this.context.log(`Output directory: ${generatedDir}`);

      // Run protoc compiler
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Check if protoc is available
      try {
        await execAsync('protoc --version');
      } catch (error) {
        warnings.push('protoc compiler not found. Please install Protocol Buffers compiler.');
        warnings.push('Installation: https://grpc.io/docs/protoc-installation/');
        return {
          success: false,
          files,
          warnings,
          error: 'protoc compiler not available. Install it from https://grpc.io/docs/protoc-installation/'
        };
      }

      // Compile for Node.js/TypeScript
      const protoDir = path.dirname(resolvedProtoPath);
      const protoFile = path.basename(resolvedProtoPath);

      // Generate JavaScript code
      const jsCommand = `protoc --proto_path=${protoDir} --js_out=import_style=commonjs,binary:${generatedDir} ${protoFile}`;
      
      this.context.log(`Executing: ${jsCommand}`);
      const { stdout: jsStdout, stderr: jsStderr } = await execAsync(jsCommand);
      
      if (jsStderr) {
        warnings.push(`protoc js warnings: ${jsStderr}`);
      }
      
      if (jsStdout) {
        this.context.log(`protoc js output: ${jsStdout}`);
      }

      // Generate gRPC service code
      const grpcCommand = `protoc --proto_path=${protoDir} --grpc_out=${generatedDir} --plugin=protoc-gen-grpc=\`which grpc_tools_node_protoc_plugin\` ${protoFile}`;
      
      this.context.log(`Executing: ${grpcCommand}`);
      try {
        const { stdout: grpcStdout, stderr: grpcStderr } = await execAsync(grpcCommand);
        
        if (grpcStderr) {
          warnings.push(`protoc grpc warnings: ${grpcStderr}`);
        }
        
        if (grpcStdout) {
          this.context.log(`protoc grpc output: ${grpcStdout}`);
        }
      } catch (error: any) {
        // grpc_tools_node_protoc_plugin might not be available, that's ok
        warnings.push('grpc_tools_node_protoc_plugin not found. Using @grpc/proto-loader instead.');
        this.context.log('Will use @grpc/proto-loader at runtime for gRPC client generation');
      }

      // Generate TypeScript definitions if grpc-tools is available
      try {
        const tsCommand = `protoc --proto_path=${protoDir} --plugin=protoc-gen-ts=\`which protoc-gen-ts\` --ts_out=${generatedDir} ${protoFile}`;
        this.context.log(`Executing: ${tsCommand}`);
        const { stdout: tsStdout, stderr: tsStderr } = await execAsync(tsCommand);
        
        if (tsStderr) {
          warnings.push(`protoc ts warnings: ${tsStderr}`);
        }
        
        if (tsStdout) {
          this.context.log(`protoc ts output: ${tsStdout}`);
        }
      } catch (error: any) {
        warnings.push('protoc-gen-ts not found. TypeScript definitions not generated.');
        this.context.log('Install grpc-tools and grpc_tools_node_protoc_plugin for full TypeScript support');
      }

      // List generated files
      const generatedFiles = fs.readdirSync(generatedDir);
      generatedFiles.forEach(file => {
        const fullPath = path.join(generatedDir, file);
        files.push(fullPath);
        this.context.log(`Generated: ${fullPath}`);
      });

      if (files.length === 0) {
        warnings.push('No files were generated by protoc. Check proto file syntax.');
      }

      this.context.log(`✓ Proto compilation complete. Generated ${files.length} files.`);

      return {
        success: true,
        files,
        warnings,
      };
    } catch (error: any) {
      this.context.error('Proto compilation failed', error);
      return {
        success: false,
        files,
        warnings,
        error: `Proto compilation failed: ${error.message}`,
      };
    }
  }

  async onStartup(): Promise<any> {
    // Skip user validation in CLI context
    if (!this.context.user) {
      this.context.log(`ServiceGenerator started (CLI mode) 🟢`);
    } else {
      this.context.log(`ServiceGenerator started 🟢`);
    }

    // Ensure templates directory exists
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
      this.context.log(`Created templates directory: ${TEMPLATES_DIR}`);
    }

    return true;
  }
}

export default ServiceGenerator;
