import ServiceManager from '../ServiceManager';

// Mock dependencies
jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

describe('ServiceManager', () => {
  let mockContext: any;
  let serviceManager: ServiceManager;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      state: {},
      telemetry: {},
    };

    // Reset singleton instance
    (ServiceManager as any).instance = null;
    serviceManager = ServiceManager.getInstance(mockContext);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance for the same context', () => {
      const instance1 = ServiceManager.getInstance(mockContext);
      const instance2 = ServiceManager.getInstance(mockContext);

      expect(instance1).toBe(instance2);
    });

    it('should create new instance for different context', () => {
      const differentContext = { ...mockContext, id: 'different' };
      const instance1 = ServiceManager.getInstance(mockContext);
      const instance2 = ServiceManager.getInstance(differentContext);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Service Registration', () => {
    beforeEach(() => {
      // Mock modules with services
      const mockModules = require('@reactory/server-core/modules');
      mockModules.enabled = [
        {
          name: 'test-module',
          services: [
            {
              id: 'test.Service@1.0.0',
              nameSpace: 'test',
              name: 'Service',
              version: '1.0.0',
              serviceType: 'data',
              lifeCycle: 'instance',
              service: jest.fn().mockReturnValue({
                name: 'Service',
                nameSpace: 'test',
                version: '1.0.0',
              }),
              dependencies: [],
            },
          ],
        },
      ];

      // Reinitialize to pick up new modules
      (ServiceManager as any).instance = null;
      serviceManager = ServiceManager.getInstance(mockContext);
    });

    it('should register services from enabled modules', () => {
      const services = serviceManager.getServices();
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('test.Service@1.0.0');
    });

    it('should create service register map', () => {
      const services = serviceManager.getServices();
      expect(services).toHaveLength(1);

      // Access private property for testing
      const serviceRegister = (serviceManager as any).serviceRegister;
      expect(serviceRegister['test.Service@1.0.0']).toBeDefined();
    });
  });

  describe('getAlias', () => {
    it('should extract service name from FQN', () => {
      const alias = (serviceManager as any).getAlias('namespace.ServiceName@1.0.0');
      expect(alias).toBe('ServiceName');
    });

    it('should handle simple service names', () => {
      const alias = (serviceManager as any).getAlias('core.UserService@1.0.0');
      expect(alias).toBe('UserService');
    });
  });

  describe('getService', () => {
    let mockServiceDefinition: any;

    beforeEach(() => {
      mockServiceDefinition = {
        id: 'test.Service@1.0.0',
        nameSpace: 'test',
        name: 'Service',
        version: '1.0.0',
        serviceType: 'data',
        lifeCycle: 'instance',
        service: jest.fn().mockReturnValue({
          name: 'Service',
          nameSpace: 'test',
          version: '1.0.0',
          setDependency: jest.fn(),
        }),
        dependencies: [],
      };

      // Set up service register
      (serviceManager as any).serviceRegister['test.Service@1.0.0'] = mockServiceDefinition;
    });

    it('should create and return service instance', () => {
      const service = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(mockServiceDefinition.service).toHaveBeenCalledWith(
        expect.objectContaining({
          $services: expect.any(Object),
          $dependencies: expect.any(Object),
        }),
        mockContext
      );
      expect(service.name).toBe('Service');
      expect(service.nameSpace).toBe('test');
      expect(service.version).toBe('1.0.0');
    });

    it('should throw error for non-existent service', () => {
      expect(() => {
        serviceManager.getService('nonexistent.Service@1.0.0', {}, mockContext);
      }).toThrow('Service nonexistent.Service@1.0.0 not found in service registry.');
    });

    it('should handle service with dependencies', () => {
      const dependencyDef = {
        id: 'test.Dependency@1.0.0',
        nameSpace: 'test',
        name: 'Dependency',
        version: '1.0.0',
        service: jest.fn().mockReturnValue({
          name: 'Dependency',
          nameSpace: 'test',
          version: '1.0.0',
        }),
        dependencies: [],
      };

      (serviceManager as any).serviceRegister['test.Dependency@1.0.0'] = dependencyDef;
      mockServiceDefinition.dependencies = ['test.Dependency@1.0.0'];

      const service = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(service.$dependencies.Dependency).toBeDefined();
    });

    it('should handle object dependency specifications', () => {
      const dependencyDef = {
        id: 'test.Dependency@1.0.0',
        nameSpace: 'test',
        name: 'Dependency',
        version: '1.0.0',
        service: jest.fn().mockReturnValue({
          name: 'Dependency',
          nameSpace: 'test',
          version: '1.0.0',
        }),
        dependencies: [],
      };

      (serviceManager as any).serviceRegister['test.Dependency@1.0.0'] = dependencyDef;
      mockServiceDefinition.dependencies = [{ alias: 'myDep', id: 'test.Dependency@1.0.0' }];

      const service = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(service.$dependencies.myDep).toBeDefined();
    });

    it('should use setter methods for dependencies when available', () => {
      const dependencyDef = {
        id: 'test.Dependency@1.0.0',
        nameSpace: 'test',
        name: 'Dependency',
        version: '1.0.0',
        service: jest.fn().mockReturnValue({
          name: 'Dependency',
          nameSpace: 'test',
          version: '1.0.0',
        }),
        dependencies: [],
      };

      (serviceManager as any).serviceRegister['test.Dependency@1.0.0'] = dependencyDef;
      mockServiceDefinition.dependencies = ['test.Dependency@1.0.0'];

      const mockServiceInstance = {
        name: 'Service',
        nameSpace: 'test',
        version: '1.0.0',
        setDependency: jest.fn(),
      };

      mockServiceDefinition.service.mockReturnValue(mockServiceInstance);

      const service = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(service.setDependency).toHaveBeenCalled();
    });

    it('should handle request-scoped services', () => {
      mockServiceDefinition.lifeCycle = 'request';
      mockContext.state['svc_request::test.Service@1.0.0'] = { cached: true };

      const service = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(service).toEqual({ cached: true });
      expect(mockServiceDefinition.service).not.toHaveBeenCalled();
    });

    it('should handle singleton services', () => {
      mockServiceDefinition.lifeCycle = 'singleton';

      const service1 = serviceManager.getService('test.Service@1.0.0', {}, mockContext);
      const service2 = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(service1).toBe(service2);
    });

    it('should add logger to service if not present', () => {
      const service = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(service.logger).toBeDefined();
      expect(typeof service.logger.log).toBe('function');
      expect(typeof service.logger.debug).toBe('function');
      expect(typeof service.logger.info).toBe('function');
      expect(typeof service.logger.warn).toBe('function');
      expect(typeof service.logger.error).toBe('function');
    });

    it('should add telemetry to service if not present', () => {
      const service = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(service.telemetry).toBe(mockContext.telemetry);
    });

    it('should set context on service if not present', () => {
      const service = serviceManager.getService('test.Service@1.0.0', {}, mockContext);

      expect(service.context).toBe(mockContext);
    });
  });

  describe('listServices', () => {
    beforeEach(() => {
      (serviceManager as any).services = [
        {
          id: 'test.Service1@1.0.0',
          name: 'Service1',
          serviceType: 'data',
          lifeCycle: 'instance',
        },
        {
          id: 'test.Service2@1.0.0',
          name: 'Service2',
          serviceType: 'api',
          lifeCycle: 'singleton',
        },
      ];
    });

    it('should return all services when no filter', () => {
      const services = serviceManager.listServices({});
      expect(services).toHaveLength(2);
    });

    it('should filter by id', () => {
      const services = serviceManager.listServices({ id: 'test.Service1@1.0.0' });
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('test.Service1@1.0.0');
    });

    it('should filter by name', () => {
      const services = serviceManager.listServices({ name: 'Service2' });
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('Service2');
    });

    it('should filter by type', () => {
      const services = serviceManager.listServices({ type: 'api' });
      expect(services).toHaveLength(1);
      expect(services[0].serviceType).toBe('api');
    });

    it('should filter by lifeCycle', () => {
      const services = serviceManager.listServices({ lifeCycle: 'singleton' });
      expect(services).toHaveLength(1);
      expect(services[0].lifeCycle).toBe('singleton');
    });

    it('should combine multiple filters', () => {
      const services = serviceManager.listServices({
        type: 'data',
        lifeCycle: 'instance'
      });
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('Service1');
    });
  });

  describe('startServices', () => {
    let mockServiceWithStartup: any;
    let mockServiceWithoutStartup: any;

    beforeEach(() => {
      mockServiceWithStartup = {
        id: 'test.StartupService@1.0.0',
        nameSpace: 'test',
        name: 'StartupService',
        version: '1.0.0',
        service: jest.fn().mockReturnValue({
          name: 'StartupService',
          nameSpace: 'test',
          version: '1.0.0',
          onStartup: jest.fn().mockResolvedValue(undefined),
        }),
        dependencies: [],
      };

      mockServiceWithoutStartup = {
        id: 'test.RegularService@1.0.0',
        nameSpace: 'test',
        name: 'RegularService',
        version: '1.0.0',
        service: jest.fn().mockReturnValue({
          name: 'RegularService',
          nameSpace: 'test',
          version: '1.0.0',
        }),
        dependencies: [],
      };

      (serviceManager as any).services = [mockServiceWithStartup, mockServiceWithoutStartup];
      (serviceManager as any).serviceRegister = {
        'test.StartupService@1.0.0': mockServiceWithStartup,
        'test.RegularService@1.0.0': mockServiceWithoutStartup,
      };
    });

    it('should call onStartup for services that have it', async () => {
      const result = await serviceManager.startServices({}, mockContext);

      expect(result).toBe(true);
      expect(mockServiceWithStartup.service).toHaveBeenCalled();
      const serviceInstance = mockServiceWithStartup.service.mock.results[0].value;
      expect(serviceInstance.onStartup).toHaveBeenCalledWith(mockContext);
    });

    it('should handle startup errors gracefully', async () => {
      const serviceInstance = mockServiceWithStartup.service.mock.results[0].value;
      serviceInstance.onStartup.mockRejectedValue(new Error('Startup failed'));

      const result = await serviceManager.startServices({}, mockContext);

      expect(result).toBe(false);
    });
  });

  describe('stopServices', () => {
    let mockServiceWithShutdown: any;
    let mockServiceWithoutShutdown: any;

    beforeEach(() => {
      mockServiceWithShutdown = {
        id: 'test.ShutdownService@1.0.0',
        nameSpace: 'test',
        name: 'ShutdownService',
        version: '1.0.0',
        service: jest.fn().mockReturnValue({
          name: 'ShutdownService',
          nameSpace: 'test',
          version: '1.0.0',
          onShutdown: jest.fn().mockResolvedValue(undefined),
        }),
        dependencies: [],
      };

      mockServiceWithoutShutdown = {
        id: 'test.RegularService@1.0.0',
        nameSpace: 'test',
        name: 'RegularService',
        version: '1.0.0',
        service: jest.fn().mockReturnValue({
          name: 'RegularService',
          nameSpace: 'test',
          version: '1.0.0',
        }),
        dependencies: [],
      };

      (serviceManager as any).services = [mockServiceWithShutdown, mockServiceWithoutShutdown];
      (serviceManager as any).serviceRegister = {
        'test.ShutdownService@1.0.0': mockServiceWithShutdown,
        'test.RegularService@1.0.0': mockServiceWithoutShutdown,
      };
    });

    it('should call onShutdown for services that have it', async () => {
      const result = await serviceManager.stopServices({}, mockContext);

      expect(result).toBe(true);
      expect(mockServiceWithShutdown.service).toHaveBeenCalled();
      const serviceInstance = mockServiceWithShutdown.service.mock.results[0].value;
      expect(serviceInstance.onShutdown).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      const serviceInstance = mockServiceWithShutdown.service.mock.results[0].value;
      serviceInstance.onShutdown.mockRejectedValue(new Error('Shutdown failed'));

      const result = await serviceManager.stopServices({}, mockContext);

      expect(result).toBe(false);
    });
  });
});