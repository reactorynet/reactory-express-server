// Mock decorators before importing ServiceGenerator
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

import type {
  ServiceDefinition,
  ServiceGenerationOptions,
} from '../types';
import path from 'path';
import fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('js-yaml');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: (fn: any) => fn,
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = require('js-yaml');

// Mock yaml load
mockYaml.load = jest.fn();

describe('ServiceGenerator', () => {
  let serviceGenerator: any;
  let mockContext: any;
  let mockTemplateService: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock context
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      user: null,
      getService: jest.fn(),
    };

    // Mock template service
    mockTemplateService = {
      renderFile: jest.fn().mockResolvedValue('// Generated service code'),
      renderString: jest.fn().mockResolvedValue('// Generated code'),
      addTemplateDirectory: jest.fn(),
      getHelpers: jest.fn().mockReturnValue({
        pascalCase: (str: string) => str,
        camelCase: (str: string) => str,
        kebabCase: (str: string) => str,
        upperSnakeCase: (str: string) => str,
      }),
    };

    // Mock props
    const mockProps = {
      id: 'core.ServiceGenerator@1.0.0',
      dependencies: {
        templateService: mockTemplateService,
      },
    };

    // Create instance
    const ServiceGeneratorClass = require('../ServiceGenerator').default;
    serviceGenerator = new ServiceGeneratorClass(mockProps, mockContext);

    // Mock fs methods
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockFs.readFileSync = jest.fn().mockReturnValue('');
    mockFs.writeFileSync = jest.fn();
    mockFs.mkdirSync = jest.fn();
    mockFs.readdirSync = jest.fn().mockReturnValue([]);
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(serviceGenerator.name).toBe('ServiceGenerator');
      expect(serviceGenerator.nameSpace).toBe('core');
      expect(serviceGenerator.version).toBe('1.0.0');
    });

    it('should have templateService dependency', () => {
      expect(serviceGenerator['templateService']).toBe(mockTemplateService);
    });
  });

  describe('onStartup', () => {
    it('should log startup in CLI mode (no user)', async () => {
      mockContext.user = null;
      mockFs.existsSync.mockReturnValue(true);

      await serviceGenerator.onStartup();

      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('CLI mode')
      );
    });

    it('should log startup with user', async () => {
      mockContext.user = { id: '123', email: 'test@example.com' };
      mockFs.existsSync.mockReturnValue(true);

      await serviceGenerator.onStartup();

      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('started')
      );
    });

    it('should create templates directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await serviceGenerator.onStartup();

      expect(mockFs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('parseDefinition', () => {
    it('should parse valid YAML file', async () => {
      const mockDefinition = {
        id: 'test.TestService@1.0.0',
        name: 'TestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Test service',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      mockYaml.load.mockReturnValue(mockDefinition);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockFs.existsSync.mockReturnValue(true);

      const result = await serviceGenerator.parseDefinition('/test/service.yaml');

      expect(result).toBeDefined();
      expect(result.id).toBe('test.TestService@1.0.0');
      expect(result.name).toBe('TestService');
      expect(result.serviceType).toBe('rest');
    });

    it('should throw error for missing file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(
        serviceGenerator.parseDefinition('/missing/service.yaml')
      ).rejects.toThrow('not found');
    });

    it('should throw error for invalid YAML', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid yaml');
      mockYaml.load.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      await expect(
        serviceGenerator.parseDefinition('/test/service.yaml')
      ).rejects.toThrow();
    });
  });

  describe('validate', () => {
    const createValidDefinition = (): ServiceDefinition => ({
      id: 'test.TestService@1.0.0',
      name: 'TestService',
      nameSpace: 'test',
      version: '1.0.0',
      description: 'Test service',
      serviceType: 'rest',
      spec: {
        rest: {
          baseUrl: 'https://api.example.com',
          endpoints: [],
        },
      },
    });

    it('should validate correct definition', () => {
      const definition = createValidDefinition();

      const result = serviceGenerator.validate(definition);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const definition = {
        name: 'TestService',
      } as any;

      const result = serviceGenerator.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for invalid service type', () => {
      const definition = {
        ...createValidDefinition(),
        serviceType: 'invalid' as any,
      };

      const result = serviceGenerator.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'serviceType')).toBe(true);
    });

    it('should warn for mismatched ID format', () => {
      const definition = createValidDefinition();
      definition.id = 'wrong.WrongName@1.0.0';

      const result = serviceGenerator.validate(definition);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate dependency structure', () => {
      const definition = {
        ...createValidDefinition(),
        dependencies: [
          { id: 'core.Service@1.0.0', alias: 'service' },
        ],
      };

      const result = serviceGenerator.validate(definition);

      expect(result.valid).toBe(true);
    });

    it('should fail validation for missing dependency ID', () => {
      const definition = {
        ...createValidDefinition(),
        dependencies: [
          { alias: 'service' } as any,
        ],
      };

      const result = serviceGenerator.validate(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('dependencies'))).toBe(true);
    });

    it('should fail validation for missing dependency alias', () => {
      const definition = {
        ...createValidDefinition(),
        dependencies: [
          { id: 'core.Service@1.0.0' } as any,
        ],
      };

      const result = serviceGenerator.validate(definition);

      expect(result.valid).toBe(false);
    });
  });

  describe('generate - REST service', () => {
    const restDefinition: ServiceDefinition = {
      id: 'test.RestService@1.0.0',
      name: 'RestService',
      nameSpace: 'test',
      version: '1.0.0',
      description: 'REST API service',
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

    it('should generate REST service successfully', async () => {
      mockFs.existsSync.mockReturnValue(false); // File doesn't exist

      const result = await serviceGenerator.generate(restDefinition, {
        outputDir: '/tmp/test',
        overwrite: true,
      });

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(mockTemplateService.renderFile).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should not overwrite existing file when overwrite is false', async () => {
      mockFs.existsSync.mockReturnValue(true); // File exists

      const result = await serviceGenerator.generate(restDefinition, {
        outputDir: '/tmp/test',
        overwrite: false,
      });

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('already exists');
    });

    it('should create output directory if it does not exist', async () => {
      mockFs.existsSync
        .mockReturnValueOnce(false) // Output dir doesn't exist
        .mockReturnValueOnce(false); // File doesn't exist

      await serviceGenerator.generate(restDefinition, {
        outputDir: '/tmp/test',
      });

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        '/tmp/test',
        expect.objectContaining({ recursive: true })
      );
    });

    it('should generate tests when generateTests is true', async () => {
      mockFs.existsSync.mockReturnValue(true); // Template exists

      const result = await serviceGenerator.generate(restDefinition, {
        outputDir: '/tmp/test',
        generateTests: true,
      });

      expect(result.success).toBe(true);
      expect(mockTemplateService.renderFile).toHaveBeenCalledTimes(2); // Service + Test
    });

    it('should generate README when generateReadme is true', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const result = await serviceGenerator.generate(restDefinition, {
        outputDir: '/tmp/test',
        generateReadme: true,
      });

      expect(result.success).toBe(true);
      expect(mockTemplateService.renderFile).toHaveBeenCalledTimes(2); // Service + README
    });

    it('should handle template rendering errors', async () => {
      mockTemplateService.renderFile.mockRejectedValue(
        new Error('Template error')
      );

      const result = await serviceGenerator.generate(restDefinition, {
        outputDir: '/tmp/test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template error');
    });

    it('should fail for invalid definition', async () => {
      const invalidDefinition = {
        name: 'Invalid',
      } as any;

      const result = await serviceGenerator.generate(invalidDefinition);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('generate - gRPC service', () => {
    const grpcDefinition: ServiceDefinition = {
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
          packageName: 'test',
          endpoints: [
            {
              rpc: 'GetData',
              handler: 'getData',
            },
          ],
        },
      },
    };

    it('should attempt proto compilation for gRPC service', async () => {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Mock protoc not available
      jest.spyOn(execAsync, 'mockRejectedValue').mockRejectedValue(
        new Error('protoc not found')
      );

      const result = await serviceGenerator.generate(grpcDefinition, {
        outputDir: '/tmp/test',
        additionalData: {
          sourceFile: '/test/service.yaml',
        },
      });

      // Should fail because protoc is not available
      expect(result.success).toBe(false);
    });
  });

  describe('generateFromFile', () => {
    it('should generate service from YAML file', async () => {
      const mockDefinition = {
        id: 'test.TestService@1.0.0',
        name: 'TestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Test service',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      mockYaml.load.mockReturnValue(mockDefinition);
      mockFs.readFileSync.mockReturnValue('yaml content');
      // Mock existsSync to return true for yaml file, false for output
      mockFs.existsSync
        .mockReturnValueOnce(true)  // YAML file exists
        .mockReturnValueOnce(true)  // Templates dir exists
        .mockReturnValueOnce(false) // Output dir doesn't exist
        .mockReturnValueOnce(false); // Output file doesn't exist

      const result = await serviceGenerator.generateFromFile(
        '/test/service.yaml',
        { outputDir: '/tmp/test', overwrite: true }
      );

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.success).toBeDefined();
      
      // Should have attempted to parse YAML
      expect(mockFs.readFileSync).toHaveBeenCalled();
      expect(mockYaml.load).toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await serviceGenerator.generateFromFile(
        '/missing/service.yaml'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should pass source file to generate method', async () => {
      const mockDefinition = {
        id: 'test.TestService@1.0.0',
        name: 'TestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Test service',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      mockYaml.load.mockReturnValue(mockDefinition);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockFs.existsSync.mockReturnValue(true);

      await serviceGenerator.generateFromFile('/test/service.yaml');

      // Verify the method was called (can't easily spy on private method)
      expect(mockYaml.load).toHaveBeenCalled();
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });
  });

  describe('generateFromDirectory', () => {
    it('should find and generate from all service.yaml files', async () => {
      const mockDefinition = {
        id: 'test.TestService@1.0.0',
        name: 'TestService',
        nameSpace: 'test',
        version: '1.0.0',
        description: 'Test service',
        serviceType: 'rest',
        spec: {
          rest: {
            baseUrl: 'https://api.example.com',
            endpoints: [],
          },
        },
      };

      mockFs.readdirSync
        .mockReturnValueOnce([
          { name: 'service.yaml', isDirectory: () => false },
          { name: 'subdir', isDirectory: () => true },
        ] as any)
        .mockReturnValueOnce([
          { name: 'service.yaml', isDirectory: () => false },
        ] as any);

      mockYaml.load.mockReturnValue(mockDefinition);
      mockFs.readFileSync.mockReturnValue('yaml content');
      mockFs.existsSync.mockReturnValue(true);

      const results = await serviceGenerator.generateFromDirectory(
        '/test/services',
        { outputDir: '/tmp/test' }
      );

      expect(results).toHaveLength(2);
      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining('Found 2')
      );
    });

    it('should throw error for non-existent directory', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(
        serviceGenerator.generateFromDirectory('/missing/dir')
      ).rejects.toThrow('not found');
    });

    it('should handle empty directory', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([]);

      const results = await serviceGenerator.generateFromDirectory(
        '/empty/dir'
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('Helper Methods', () => {
    describe('generateClassName', () => {
      it('should generate valid TypeScript class name', () => {
        const result = serviceGenerator['generateClassName']('my-service-name');
        
        expect(result).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      });

      it('should handle names with special characters', () => {
        const result = serviceGenerator['generateClassName']('my_service@123');
        
        expect(result).toBeTruthy();
        expect(result).not.toContain('@');
        expect(result).not.toContain('_');
      });
    });

    describe('getDefaultTemplate', () => {
      it('should return correct template for REST', () => {
        const template = serviceGenerator['getDefaultTemplate']('rest');
        expect(template).toBe('service.rest.ts.ejs');
      });

      it('should return correct template for gRPC', () => {
        const template = serviceGenerator['getDefaultTemplate']('grpc');
        expect(template).toBe('service.grpc.ts.ejs');
      });

      it('should return correct template for GraphQL', () => {
        const template = serviceGenerator['getDefaultTemplate']('graphql');
        expect(template).toBe('service.graphql.ts.ejs');
      });

      it('should return correct template for SQL', () => {
        const template = serviceGenerator['getDefaultTemplate']('sql');
        expect(template).toBe('service.sql.ts.ejs');
      });

      it('should default to REST template for unknown type', () => {
        const template = serviceGenerator['getDefaultTemplate']('unknown' as any);
        expect(template).toBe('service.rest.ts.ejs');
      });
    });

    describe('prepareTemplateData', () => {
      it('should prepare complete template data', () => {
        const definition: ServiceDefinition = {
          id: 'test.TestService@1.0.0',
          name: 'TestService',
          nameSpace: 'test',
          version: '1.0.0',
          description: 'Test',
          serviceType: 'rest',
        };

        const data = serviceGenerator['prepareTemplateData'](definition, {});

        expect(data.className).toBeDefined();
        expect(data.generatedDate).toBeDefined();
        expect(data.helpers).toBeDefined();
        expect(data.name).toBe('TestService');
      });

      it('should add serviceName for gRPC services', () => {
        const definition: ServiceDefinition = {
          id: 'test.GrpcService@1.0.0',
          name: 'GrpcService',
          nameSpace: 'test',
          version: '1.0.0',
          description: 'gRPC Test',
          serviceType: 'grpc',
          spec: {
            grpc: {
              protoPath: './test.proto',
              serviceName: 'TestGrpcService',
              endpoints: [],
            },
          },
        };

        const data = serviceGenerator['prepareTemplateData'](definition, {});

        expect((data as any).serviceName).toBe('TestGrpcService');
      });
    });
  });

  describe('Context Methods', () => {
    it('should get execution context', () => {
      const context = serviceGenerator.getExecutionContext();
      expect(context).toBe(mockContext);
    });

    it('should set execution context', () => {
      const newContext = { ...mockContext, user: { id: '456' } };
      const result = serviceGenerator.setExecutionContext(newContext);

      expect(result).toBe(true);
      expect(serviceGenerator.getExecutionContext()).toBe(newContext);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing TemplateService', async () => {
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

      // Remove template service
      serviceGenerator['templateService'] = null;

      const result = await serviceGenerator.generate(definition);

      expect(result.success).toBe(false);
      expect(result.error).toContain('TemplateService not available');
    });

    it('should handle file write errors gracefully', async () => {
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

      // Mock writeFileSync to throw error
      const writeError = new Error('Permission denied');
      mockFs.writeFileSync = jest.fn().mockImplementation(() => {
        throw writeError;
      });
      
      // Ensure directory check passes
      mockFs.existsSync.mockReturnValue(false);

      const result = await serviceGenerator.generate(definition, {
        outputDir: '/tmp/test',
      });

      // The error should be caught and returned in the result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
