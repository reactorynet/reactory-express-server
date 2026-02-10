// Mock decorators before importing
jest.mock('@reactory/server-core/application/decorators', () => ({
  service: () => (target: any) => target,
  inject: () => (target: any, propertyKey: string) => {},
}));

jest.mock('@reactory/server-core/authentication/decorators', () => ({
  roles: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

// Mock environment
process.env.APP_DATA_ROOT = '/tmp/test-data';
process.env.NODE_ENV = 'test';

// Mock swagger module
jest.mock('../swagger', () => ({
  SwaggerGeneratorFactory: {
    parse: jest.fn(),
  },
}));

import type {
  ServiceDefinition,
  ServiceGenerationOptions,
} from '../types';
import fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('js-yaml');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = require('js-yaml');
const { SwaggerGeneratorFactory } = require('../swagger');

// Mock yaml load
mockYaml.load = jest.fn();

describe('ServiceGenerator - Swagger Integration', () => {
  let serviceGenerator: any;
  let mockContext: any;
  let mockTemplateService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      user: null,
    };

    mockTemplateService = {
      renderFile: jest.fn().mockResolvedValue('// Generated service code'),
      addTemplateDirectory: jest.fn(),
      getHelpers: jest.fn().mockReturnValue({
        pascalCase: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
        camelCase: (str: string) => str.charAt(0).toLowerCase() + str.slice(1),
        kebabCase: (str: string) => str.toLowerCase().replace(/\s+/g, '-'),
        upperSnakeCase: (str: string) => str.toUpperCase().replace(/\s+/g, '_'),
      }),
    };

    const mockProps = {
      id: 'core.ServiceGenerator@1.0.0',
      dependencies: {
        templateService: mockTemplateService,
      },
    };

    const ServiceGeneratorClass = require('../ServiceGenerator').default;
    serviceGenerator = new ServiceGeneratorClass(mockProps, mockContext);

    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.readFileSync = jest.fn();
    mockFs.writeFileSync = jest.fn();
    mockFs.mkdirSync = jest.fn();
    mockFs.readdirSync = jest.fn().mockReturnValue([]);
  });

  describe('Swagger from File', () => {
    it('should generate service from local swagger file', async () => {
      const definition: ServiceDefinition = {
        id: 'test.SwaggerService@1.0.0',
        name: 'SwaggerService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Swagger service',
        serviceType: 'rest',
        spec: {
          swagger: './swagger.json',
        },
      };

      const parsedSpec = {
        version: 'openapi-3',
        info: { title: 'Test API', version: '1.0' },
        baseUrl: 'https://api.example.com',
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            parameters: [],
            responses: {},
          },
        ],
        schemas: {},
      };

      SwaggerGeneratorFactory.parse.mockResolvedValue(parsedSpec);
      mockFs.existsSync.mockReturnValue(true);

      const result = await serviceGenerator.generate(definition, {
        outputDir: '/tmp/test',
        overwrite: true,
        additionalData: {
          sourceFile: '/test/service.yaml',
        },
      });

      expect(SwaggerGeneratorFactory.parse).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should generate service from remote swagger URL', async () => {
      const definition: ServiceDefinition = {
        id: 'test.SwaggerService@1.0.0',
        name: 'SwaggerService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Swagger service',
        serviceType: 'rest',
        spec: {
          swagger: 'https://api.example.com/swagger.json',
        },
      };

      const parsedSpec = {
        version: 'openapi-3',
        info: { title: 'Test API', version: '1.0' },
        baseUrl: 'https://api.example.com',
        endpoints: [],
        schemas: {},
      };

      SwaggerGeneratorFactory.parse.mockResolvedValue(parsedSpec);
      mockFs.existsSync.mockReturnValue(true);

      const result = await serviceGenerator.generate(definition, {
        outputDir: '/tmp/test',
      });

      expect(SwaggerGeneratorFactory.parse).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://api.example.com/swagger.json' })
      );
    });

    it('should use openapi field as alias for swagger', async () => {
      const definition: ServiceDefinition = {
        id: 'test.OpenAPIService@1.0.0',
        name: 'OpenAPIService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'OpenAPI service',
        serviceType: 'rest',
        spec: {
          openapi: './openapi.yaml',
        },
      };

      const parsedSpec = {
        version: 'openapi-3',
        info: { title: 'Test API', version: '1.0' },
        endpoints: [],
        schemas: {},
      };

      SwaggerGeneratorFactory.parse.mockResolvedValue(parsedSpec);
      mockFs.existsSync.mockReturnValue(true);

      await serviceGenerator.generate(definition);

      expect(SwaggerGeneratorFactory.parse).toHaveBeenCalled();
    });

    it('should handle swagger parsing errors', async () => {
      const definition: ServiceDefinition = {
        id: 'test.SwaggerService@1.0.0',
        name: 'SwaggerService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Swagger service',
        serviceType: 'rest',
        spec: {
          swagger: './swagger.json',
        },
      };

      SwaggerGeneratorFactory.parse.mockRejectedValue(
        new Error('Invalid swagger specification')
      );

      const result = await serviceGenerator.generate(definition);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Swagger generation failed');
    });

    it('should merge swagger endpoints with manual endpoints', async () => {
      const definition: ServiceDefinition = {
        id: 'test.MixedService@1.0.0',
        name: 'MixedService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Mixed service',
        serviceType: 'rest',
        spec: {
          swagger: './swagger.json',
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [
              {
                path: '/custom',
                method: 'POST',
                handler: 'customEndpoint',
              },
            ],
          },
        },
      };

      const parsedSpec = {
        version: 'openapi-3',
        info: { title: 'Test API', version: '1.0' },
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            parameters: [],
            responses: {},
          },
        ],
        schemas: {},
      };

      SwaggerGeneratorFactory.parse.mockResolvedValue(parsedSpec);
      mockFs.existsSync.mockReturnValue(true);

      const result = await serviceGenerator.generate(definition, {
        outputDir: '/tmp/test',
      });

      expect(result).toBeDefined();
      expect(result.warnings.some((w: string) => w.includes('Merged'))).toBe(true);
    });
  });

  describe('Endpoint Conversion', () => {
    it('should convert swagger endpoint to REST endpoint with path params', () => {
      const swaggerEndpoint = {
        path: '/users/{id}',
        method: 'GET',
        operationId: 'getUserById',
        summary: 'Get user by ID',
        parameters: [
          {
            name: 'id',
            in: 'path' as const,
            type: 'string',
            required: true,
          },
        ],
        responses: {
          '200': {
            statusCode: '200',
            description: 'Success',
          },
        },
      };

      const result = serviceGenerator['convertParsedEndpointToRestEndpoint'](swaggerEndpoint);

      expect(result.path).toBe('/users/{id}');
      expect(result.method).toBe('GET');
      expect(result.handler).toBe('getUserById');
      expect(result.params).toHaveLength(1);
      expect(result.params[0].name).toBe('id');
    });

    it('should convert swagger endpoint with query params', () => {
      const swaggerEndpoint = {
        path: '/users',
        method: 'GET',
        parameters: [
          {
            name: 'page',
            in: 'query' as const,
            type: 'number',
            required: false,
            default: 1,
          },
          {
            name: 'limit',
            in: 'query' as const,
            type: 'number',
            required: false,
            enum: [10, 20, 50],
          },
        ],
        responses: {},
      };

      const result = serviceGenerator['convertParsedEndpointToRestEndpoint'](swaggerEndpoint);

      expect(result.query).toHaveLength(2);
      expect(result.query[0].name).toBe('page');
      expect(result.query[0].default).toBe(1);
      expect(result.query[1].enum).toEqual([10, 20, 50]);
    });

    it('should convert swagger endpoint with request body', () => {
      const swaggerEndpoint = {
        path: '/users',
        method: 'POST',
        parameters: [],
        requestBody: {
          required: true,
          contentType: 'application/json',
          description: 'User data',
          schema: {
            type: 'object',
            properties: {},
          },
        },
        responses: {},
      };

      const result = serviceGenerator['convertParsedEndpointToRestEndpoint'](swaggerEndpoint);

      expect(result.body).toBeDefined();
      expect(result.body.required).toBe(true);
      expect(result.body.contentType).toBe('application/json');
    });

    it('should handle deprecated endpoints', () => {
      const swaggerEndpoint = {
        path: '/old-api',
        method: 'GET',
        deprecated: true,
        parameters: [],
        responses: {},
      };

      const result = serviceGenerator['convertParsedEndpointToRestEndpoint'](swaggerEndpoint);

      expect(result.deprecated).toBe(true);
    });

    it('should handle authenticated endpoints', () => {
      const swaggerEndpoint = {
        path: '/secure',
        method: 'GET',
        authentication: true,
        parameters: [],
        responses: {},
      };

      const result = serviceGenerator['convertParsedEndpointToRestEndpoint'](swaggerEndpoint);

      expect(result.authentication).toBe(true);
    });

    it('should generate handler name when operationId is missing', () => {
      const swaggerEndpoint = {
        path: '/products/{id}/reviews',
        method: 'GET',
        parameters: [],
        responses: {},
      };

      const result = serviceGenerator['convertParsedEndpointToRestEndpoint'](swaggerEndpoint);

      expect(result.handler).toBeTruthy();
      expect(result.handler).toContain('get');
    });
  });

  describe('Handler Name Generation', () => {
    it('should generate handler name from simple path', () => {
      const name = serviceGenerator['generateHandlerName']('/users', 'get');
      expect(name).toBe('getUsers');
    });

    it('should handle path parameters', () => {
      const name = serviceGenerator['generateHandlerName']('/users/{id}', 'get');
      expect(name).toBe('getUsersById');
    });

    it('should handle complex paths', () => {
      const name = serviceGenerator['generateHandlerName'](
        '/users/{id}/orders/{orderId}',
        'post'
      );
      expect(name).toBe('postUsersByIdOrdersByOrderId');
    });

    it('should handle different HTTP methods', () => {
      expect(serviceGenerator['generateHandlerName']('/items', 'get')).toBe('getItems');
      expect(serviceGenerator['generateHandlerName']('/items', 'post')).toBe('postItems');
      expect(serviceGenerator['generateHandlerName']('/items', 'put')).toBe('putItems');
      expect(serviceGenerator['generateHandlerName']('/items', 'delete')).toBe('deleteItems');
    });
  });

  describe('Capitalize Helper', () => {
    it('should capitalize first letter', () => {
      expect(serviceGenerator['capitalize']('hello')).toBe('Hello');
      expect(serviceGenerator['capitalize']('HELLO')).toBe('HELLO');
      expect(serviceGenerator['capitalize']('h')).toBe('H');
      expect(serviceGenerator['capitalize']('')).toBe('');
    });
  });
});
