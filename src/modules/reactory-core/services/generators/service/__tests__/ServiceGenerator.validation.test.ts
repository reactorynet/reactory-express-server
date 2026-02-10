// Mock decorators
jest.mock('@reactory/server-core/application/decorators', () => ({
  service: () => (target: any) => target,
}));

jest.mock('@reactory/server-core/authentication/decorators', () => ({
  roles: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

process.env.APP_DATA_ROOT = '/tmp/test-data';
process.env.NODE_ENV = 'test';

import type { ServiceDefinition } from '../types';
import fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ServiceGenerator - Validation Coverage', () => {
  let serviceGenerator: any;
  let mockContext: any;
  let mockTemplateService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    mockTemplateService = {
      renderFile: jest.fn().mockResolvedValue('// code'),
      addTemplateDirectory: jest.fn(),
      getHelpers: jest.fn().mockReturnValue({}),
    };

    const ServiceGeneratorClass = require('../ServiceGenerator').default;
    serviceGenerator = new ServiceGeneratorClass(
      { dependencies: { templateService: mockTemplateService } },
      mockContext
    );

    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.writeFileSync = jest.fn();
    mockFs.mkdirSync = jest.fn();
  });

  describe('Spec Validation', () => {
    it('should validate REST spec with endpoints', () => {
      const definition: ServiceDefinition = {
        id: 'test.RestService@1.0.0',
        name: 'RestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'REST service',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [
              {
                path: '/users',
                method: 'GET',
                handler: 'getUsers',
              },
            ],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.valid).toBe(true);
    });

    it('should error when REST spec has no baseUrl', () => {
      const definition: ServiceDefinition = {
        id: 'test.RestService@1.0.0',
        name: 'RestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'REST service',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: '',
            endpoints: [],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: any) => e.path === 'spec.rest.baseUrl')).toBe(true);
    });

    it('should warn when REST spec has no endpoints', () => {
      const definition: ServiceDefinition = {
        id: 'test.RestService@1.0.0',
        name: 'RestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'REST service',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.warnings.some((w: any) => w.path === 'spec.rest.endpoints')).toBe(true);
    });

    it('should validate gRPC spec with proto path', () => {
      const definition: ServiceDefinition = {
        id: 'test.GrpcService@1.0.0',
        name: 'GrpcService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'gRPC service',
        serviceType: 'grpc',
        spec: {
          grpc: {
            protoPath: './test.proto',
            serviceName: 'TestService',
            endpoints: [],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.valid).toBe(true);
    });

    it('should error when gRPC spec has no proto path', () => {
      const definition: ServiceDefinition = {
        id: 'test.GrpcService@1.0.0',
        name: 'GrpcService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'gRPC service',
        serviceType: 'grpc',
        spec: {
          grpc: {
            protoPath: '',
            serviceName: 'Test',
            endpoints: [],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: any) => e.path === 'spec.grpc.protoPath')).toBe(true);
    });

    it('should validate GraphQL spec with endpoint', () => {
      const definition: ServiceDefinition = {
        id: 'test.GraphQLService@1.0.0',
        name: 'GraphQLService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'GraphQL service',
        serviceType: 'graphql',
        spec: {
          graphql: {
            endpoint: 'https://api.example.com/graphql',
            operations: [],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.valid).toBe(true);
    });

    it('should error when GraphQL spec has no endpoint', () => {
      const definition: ServiceDefinition = {
        id: 'test.GraphQLService@1.0.0',
        name: 'GraphQLService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'GraphQL service',
        serviceType: 'graphql',
        spec: {
          graphql: {
            endpoint: '',
            operations: [],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: any) => e.path === 'spec.graphql.endpoint')).toBe(true);
    });

    it('should validate SQL spec with data source', () => {
      const definition: ServiceDefinition = {
        id: 'test.SqlService@1.0.0',
        name: 'SqlService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'SQL service',
        serviceType: 'sql',
        spec: {
          sql: {
            dataSource: 'postgresql://localhost/test',
            queries: [],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.valid).toBe(true);
    });

    it('should error when SQL spec has no data source', () => {
      const definition: ServiceDefinition = {
        id: 'test.SqlService@1.0.0',
        name: 'SqlService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'SQL service',
        serviceType: 'sql',
        spec: {
          sql: {
            dataSource: '',
            queries: [],
          },
        },
      };

      const result = serviceGenerator.validate(definition);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: any) => e.path === 'spec.sql.dataSource')).toBe(true);
    });
  });

  describe('Test and README Generation Edge Cases', () => {
    it('should skip test generation when template is missing', async () => {
      const definition: ServiceDefinition = {
        id: 'test.TestService@1.0.0',
        name: 'TestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Test',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      // Mock template file doesn't exist
      mockFs.existsSync
        .mockReturnValueOnce(true)  // Output dir
        .mockReturnValueOnce(false) // Output file
        .mockReturnValueOnce(false); // Test template missing

      const result = await serviceGenerator.generate(definition, {
        outputDir: '/tmp/test',
        generateTests: true,
      });

      expect(result.warnings.some((w: string) => w.includes('Test template not found'))).toBe(true);
    });

    it('should skip README generation when template is missing', async () => {
      const definition: ServiceDefinition = {
        id: 'test.TestService@1.0.0',
        name: 'TestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Test',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      // Mock template file doesn't exist
      mockFs.existsSync
        .mockReturnValueOnce(true)  // Output dir
        .mockReturnValueOnce(false) // Output file
        .mockReturnValueOnce(false); // README template missing

      const result = await serviceGenerator.generate(definition, {
        outputDir: '/tmp/test',
        generateReadme: true,
      });

      expect(result.warnings.some((w: string) => w.includes('README template not found'))).toBe(true);
    });

    it('should handle test generation errors', async () => {
      const definition: ServiceDefinition = {
        id: 'test.TestService@1.0.0',
        name: 'TestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Test',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockTemplateService.renderFile
        .mockResolvedValueOnce('// service code')
        .mockRejectedValueOnce(new Error('Test render error'));

      const result = await serviceGenerator.generate(definition, {
        outputDir: '/tmp/test',
        generateTests: true,
      });

      expect(result.warnings.some((w: string) => w.includes('Failed to generate tests'))).toBe(true);
    });

    it('should handle README generation errors', async () => {
      const definition: ServiceDefinition = {
        id: 'test.TestService@1.0.0',
        name: 'TestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Test',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockTemplateService.renderFile
        .mockResolvedValueOnce('// service code')
        .mockRejectedValueOnce(new Error('README render error'));

      const result = await serviceGenerator.generate(definition, {
        outputDir: '/tmp/test',
        generateReadme: true,
      });

      expect(result.warnings.some((w: string) => w.includes('Failed to generate README'))).toBe(true);
    });
  });
});
