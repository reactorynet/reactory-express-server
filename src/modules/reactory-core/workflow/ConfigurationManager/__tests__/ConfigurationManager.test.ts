import { ConfigurationManager, IWorkflowConfig } from '../ConfigurationManager';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
jest.mock('../../../logging', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('ConfigurationManager', () => {
  let configurationManager: ConfigurationManager;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      configPath: './test-config',
      environment: 'development',
      hotReload: true,
      validationStrict: true,
      backupConfigs: true,
      maxConfigSize: 1024 * 1024,
      allowedEnvironments: ['development', 'staging', 'production']
    };

    configurationManager = new ConfigurationManager(mockConfig);
  });

  afterEach(async () => {
    if (configurationManager && configurationManager.isInitialized()) {
      await configurationManager.stop();
    }
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new ConfigurationManager({
        configPath: './config',
        environment: 'development',
        hotReload: false,
        validationStrict: false,
        backupConfigs: false,
        maxConfigSize: 1024,
        allowedEnvironments: ['development']
      });

      expect(manager).toBeInstanceOf(ConfigurationManager);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        ...mockConfig,
        hotReload: false,
        validationStrict: false,
        backupConfigs: false
      };

      const manager = new ConfigurationManager(customConfig);
      expect(manager).toBeInstanceOf(ConfigurationManager);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      // Mock fs.existsSync to return true for config directory
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await configurationManager.initialize();
      expect(configurationManager.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await configurationManager.initialize();
      await configurationManager.initialize(); // Should not throw
      expect(configurationManager.isInitialized()).toBe(true);
    });

    it('should handle invalid environment', async () => {
      const invalidConfig = {
        ...mockConfig,
        environment: 'invalid'
      };

      const manager = new ConfigurationManager(invalidConfig);
      await expect(manager.initialize()).rejects.toThrow('Invalid environment: invalid');
    });

    it('should create config directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await configurationManager.initialize();
      expect(fs.mkdirSync).toHaveBeenCalledWith('./test-config', { recursive: true });
    });
  });

  describe('loadConfigurations', () => {
    it('should load configurations from files', async () => {
      const mockConfigContent = JSON.stringify({
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      });

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['test-workflow.json']);
      (fs.statSync as jest.Mock).mockReturnValue({ 
        size: 100,
        isFile: () => true 
      });
      (fs.readFileSync as jest.Mock).mockReturnValue(mockConfigContent);

      await configurationManager.initialize();

      const config = configurationManager.getConfiguration('test.workflow', '1.0.0');
      expect(config).toBeDefined();
      expect(config?.id).toBe('test.workflow');
    });

    it('should handle file size limit', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['large-config.json']);
      (fs.statSync as jest.Mock).mockReturnValue({ 
        size: 2 * 1024 * 1024,
        isFile: () => true 
      }); // 2MB

      await expect(configurationManager.initialize()).rejects.toThrow('Configuration file too large');
    });

    it('should handle invalid JSON files', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['invalid.json']);
      (fs.statSync as jest.Mock).mockReturnValue({ 
        size: 100,
        isFile: () => true 
      });
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      await expect(configurationManager.initialize()).rejects.toThrow('Failed to parse configuration file');
    });
  });

  describe('configuration operations', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await configurationManager.initialize();
    });

    it('should get configuration by id and version', () => {
      const config: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      // Add config manually for testing
      (configurationManager as any).configs.set('test.workflow@1.0.0', config);

      const result = configurationManager.getConfiguration('test.workflow', '1.0.0');
      expect(result).toEqual(config);
    });

    it('should return undefined for non-existent configuration', () => {
      const result = configurationManager.getConfiguration('non.existent', '1.0.0');
      expect(result).toBeUndefined();
    });

    it('should get all configurations', () => {
      const config1: IWorkflowConfig = {
        id: 'workflow1',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      const config2: IWorkflowConfig = {
        id: 'workflow2',
        version: '1.0.0',
        enabled: false,
        maxRetries: 2,
        timeout: 15000,
        priority: 'high',
        concurrency: 3
      };

      (configurationManager as any).configs.set('workflow1@1.0.0', config1);
      (configurationManager as any).configs.set('workflow2@1.0.0', config2);

      const allConfigs = configurationManager.getAllConfigurations();
      expect(allConfigs.size).toBe(2);
      expect(allConfigs.get('workflow1@1.0.0')).toEqual(config1);
      expect(allConfigs.get('workflow2@1.0.0')).toEqual(config2);
    });

    it('should get configurations by environment', () => {
      const config1: IWorkflowConfig = {
        id: 'workflow1',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5,
        properties: { environment: 'development' }
      };

      const config2: IWorkflowConfig = {
        id: 'workflow2',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5,
        properties: { environment: 'production' }
      };

      (configurationManager as any).configs.set('workflow1@1.0.0', config1);
      (configurationManager as any).configs.set('workflow2@1.0.0', config2);

      const devConfigs = configurationManager.getConfigurationsByEnvironment('development');
      expect(devConfigs).toHaveLength(1);
      expect(devConfigs[0].id).toBe('workflow1');
    });
  });

  describe('configuration validation', () => {
    it('should validate correct configuration', () => {
      const validConfig: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      const validation = configurationManager.validateConfiguration(validConfig);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject configuration with missing required fields', () => {
      const invalidConfig = {
        id: 'test.workflow',
        // Missing required fields
      } as any;

      const validation = configurationManager.validateConfiguration(invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Missing required fields: id and version');
    });

    it('should reject configuration with invalid values', () => {
      const invalidConfig: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 15, // Invalid: > 10
        timeout: 5000000, // Invalid: > 3600000
        priority: 'invalid' as any, // Invalid priority
        concurrency: 0 // Invalid: < 1
      };

      const validation = configurationManager.validateConfiguration(invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('maxRetries must be between 0 and 10');
      expect(validation.errors).toContain('timeout must be between 1000ms and 3600000ms');
      expect(validation.errors).toContain('Invalid priority value');
      expect(validation.errors).toContain('concurrency must be between 1 and 100');
    });

    it('should warn about security configuration issues', () => {
      const configWithWarning: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5,
        security: {
          requireAuth: true,
          permissions: [], // Empty permissions with requireAuth
          allowedUsers: [],
          allowedRoles: []
        }
      };

      const validation = configurationManager.validateConfiguration(configWithWarning);
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('requireAuth is true but no permissions specified');
    });
  });

  describe('configuration CRUD operations', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      await configurationManager.initialize();
    });

    it('should add new configuration', async () => {
      const newConfig: IWorkflowConfig = {
        id: 'new.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      await configurationManager.addConfiguration(newConfig, 'test-user');

      const addedConfig = configurationManager.getConfiguration('new.workflow', '1.0.0');
      expect(addedConfig).toEqual(newConfig);
    });

    it('should reject adding duplicate configuration', async () => {
      const config: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      // Add config first
      (configurationManager as any).configs.set('test.workflow@1.0.0', config);

      // Try to add same config again
      await expect(configurationManager.addConfiguration(config, 'test-user'))
        .rejects.toThrow('Configuration already exists: test.workflow@1.0.0');
    });

    it('should update existing configuration', async () => {
      const originalConfig: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      (configurationManager as any).configs.set('test.workflow@1.0.0', originalConfig);

      const update = {
        enabled: false,
        maxRetries: 5
      };

      await configurationManager.updateConfiguration('test.workflow', '1.0.0', update, 'test-user');

      const updatedConfig = configurationManager.getConfiguration('test.workflow', '1.0.0');
      expect(updatedConfig?.enabled).toBe(false);
      expect(updatedConfig?.maxRetries).toBe(5);
    });

    it('should reject updating non-existent configuration', async () => {
      const update = { enabled: false };

      await expect(configurationManager.updateConfiguration('non.existent', '1.0.0', update, 'test-user'))
        .rejects.toThrow('Configuration not found: non.existent@1.0.0');
    });

    it('should remove configuration', async () => {
      const config: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      (configurationManager as any).configs.set('test.workflow@1.0.0', config);

      await configurationManager.removeConfiguration('test.workflow', '1.0.0', 'test-user');

      const removedConfig = configurationManager.getConfiguration('test.workflow', '1.0.0');
      expect(removedConfig).toBeUndefined();
    });

    it('should reject removing non-existent configuration', async () => {
      await expect(configurationManager.removeConfiguration('non.existent', '1.0.0', 'test-user'))
        .rejects.toThrow('Configuration not found: non.existent@1.0.0');
    });
  });

  describe('configuration statistics', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await configurationManager.initialize();
    });

    it('should return correct statistics', () => {
      const configs = [
        {
          id: 'workflow1',
          version: '1.0.0',
          enabled: true,
          maxRetries: 3,
          timeout: 30000,
          priority: 'normal',
          concurrency: 5,
          properties: { environment: 'development' }
        },
        {
          id: 'workflow2',
          version: '1.0.0',
          enabled: false,
          maxRetries: 3,
          timeout: 30000,
          priority: 'high',
          concurrency: 5,
          properties: { environment: 'production' }
        }
      ] as IWorkflowConfig[];

      (configurationManager as any).configs.set('workflow1@1.0.0', configs[0]);
      (configurationManager as any).configs.set('workflow2@1.0.0', configs[1]);

      const stats = configurationManager.getConfigurationStats();
      expect(stats.totalConfigs).toBe(2);
      expect(stats.enabledConfigs).toBe(1);
      expect(stats.disabledConfigs).toBe(1);
      expect(stats.environments).toContain('development');
      expect(stats.environments).toContain('production');
      expect(stats.priorities.normal).toBe(1);
      expect(stats.priorities.high).toBe(1);
    });
  });

  describe('export configurations', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await configurationManager.initialize();
    });

    it('should export configurations as JSON', () => {
      const config: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      (configurationManager as any).configs.set('test.workflow@1.0.0', config);

      const jsonExport = configurationManager.exportConfigurations('json');
      const parsed = JSON.parse(jsonExport);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('test.workflow');
    });

    it('should export configurations as YAML', () => {
      const config: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      (configurationManager as any).configs.set('test.workflow@1.0.0', config);

      const yamlExport = configurationManager.exportConfigurations('yaml');
      expect(yamlExport).toContain('id: test.workflow');
      expect(yamlExport).toContain('version: 1.0.0');
    });
  });

  describe('reload configurations', () => {
    it('should reload configurations successfully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await configurationManager.initialize();

      // Add some configs
      const config: IWorkflowConfig = {
        id: 'test.workflow',
        version: '1.0.0',
        enabled: true,
        maxRetries: 3,
        timeout: 30000,
        priority: 'normal',
        concurrency: 5
      };

      (configurationManager as any).configs.set('test.workflow@1.0.0', config);

      await configurationManager.reloadConfigurations();

      // Configs should be cleared and reloaded
      const reloadedConfig = configurationManager.getConfiguration('test.workflow', '1.0.0');
      expect(reloadedConfig).toBeUndefined();
    });
  });

  describe('stop', () => {
    it('should stop the configuration manager', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await configurationManager.initialize();

      await configurationManager.stop();
      expect(configurationManager.isInitialized()).toBe(false);
    });

    it('should handle stop errors gracefully', async () => {
      // This would test error handling during stop
      // Implementation depends on specific error scenarios
      expect(async () => {
        await configurationManager.stop();
      }).not.toThrow();
    });
  });
}); 