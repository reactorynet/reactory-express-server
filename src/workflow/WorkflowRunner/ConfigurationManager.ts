import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import logger from '../../logging';

export interface IWorkflowConfig {
  id: string;
  version: string;
  nameSpace?: string;
  enabled: boolean;
  maxRetries: number;
  timeout: number; // milliseconds
  priority: 'low' | 'normal' | 'high' | 'critical';
  concurrency: number;
  dependencies?: string[];
  properties?: Record<string, any>;
  security?: {
    permissions: string[];
    allowedUsers: string[];
    allowedRoles: string[];
    requireAuth: boolean;
  };
  monitoring?: {
    enabled: boolean;
    metrics: string[];
    alerts: string[];
  };
  validation?: {
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
    customValidators?: string[];
  };
}

export interface IConfigurationManagerConfig {
  configPath: string;
  environment: string;
  hotReload: boolean;
  validationStrict: boolean;
  backupConfigs: boolean;
  maxConfigSize: number; // bytes
  allowedEnvironments: string[];
  configEncryption?: {
    enabled: boolean;
    algorithm: string;
    keyPath?: string;
  };
}

export interface IConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  schema?: Record<string, any>;
}

export interface IConfigurationChangeEvent {
  workflowId: string;
  version: string;
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
  };
  timestamp: Date;
  user?: string;
}

export class ConfigurationManager extends EventEmitter {
  private configs: Map<string, IWorkflowConfig> = new Map();
  private configPath: string;
  private environment: string;
  private hotReload: boolean;
  private validationStrict: boolean;
  private backupConfigs: boolean;
  private maxConfigSize: number;
  private allowedEnvironments: string[];
  private configEncryption?: {
    enabled: boolean;
    algorithm: string;
    keyPath?: string;
  };
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();
  private _isInitialized: boolean = false;
  private configSchema: Record<string, any>;

  constructor(config: IConfigurationManagerConfig) {
    super();
    this.configPath = config.configPath;
    this.environment = config.environment;
    this.hotReload = config.hotReload;
    this.validationStrict = config.validationStrict;
    this.backupConfigs = config.backupConfigs;
    this.maxConfigSize = config.maxConfigSize;
    this.allowedEnvironments = config.allowedEnvironments;
    this.configEncryption = config.configEncryption;
    
    // Define configuration schema
    this.configSchema = {
      type: 'object',
      required: ['id', 'version', 'enabled', 'maxRetries', 'timeout', 'priority', 'concurrency'],
      properties: {
        id: { type: 'string', pattern: '^[a-zA-Z0-9._-]+$' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        nameSpace: { type: 'string' },
        enabled: { type: 'boolean' },
        maxRetries: { type: 'number', minimum: 0, maximum: 10 },
        timeout: { type: 'number', minimum: 1000, maximum: 3600000 },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
        concurrency: { type: 'number', minimum: 1, maximum: 100 },
        dependencies: { type: 'array', items: { type: 'string' } },
        properties: { type: 'object' },
        security: {
          type: 'object',
          properties: {
            permissions: { type: 'array', items: { type: 'string' } },
            allowedUsers: { type: 'array', items: { type: 'string' } },
            allowedRoles: { type: 'array', items: { type: 'string' } },
            requireAuth: { type: 'boolean' }
          }
        },
        monitoring: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            metrics: { type: 'array', items: { type: 'string' } },
            alerts: { type: 'array', items: { type: 'string' } }
          }
        },
        validation: {
          type: 'object',
          properties: {
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            customValidators: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    };
  }

  /**
   * Initialize the configuration manager
   */
  public async initialize(): Promise<void> {
    if (this._isInitialized) {
      logger.warn('ConfigurationManager already initialized');
      return;
    }

    try {
      logger.info('Initializing ConfigurationManager');

      // Validate environment
      if (!this.allowedEnvironments.includes(this.environment)) {
        throw new Error(`Invalid environment: ${this.environment}`);
      }

      // Create config directory if it doesn't exist
      await this.ensureConfigDirectory();

      // Load configurations
      await this.loadConfigurations();

      // Set up hot reload if enabled
      if (this.hotReload) {
        await this.setupHotReload();
      }

      this._isInitialized = true;
      logger.info('ConfigurationManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ConfigurationManager', error);
      throw error;
    }
  }

  /**
   * Load all workflow configurations
   */
  public async loadConfigurations(): Promise<void> {
    try {
      const configFiles = await this.getConfigFiles();
      
      for (const file of configFiles) {
        await this.loadConfigurationFile(file);
      }

      logger.info(`Loaded ${this.configs.size} workflow configurations`);
    } catch (error) {
      logger.error('Failed to load configurations', error);
      throw error;
    }
  }

  /**
   * Load a specific configuration file
   */
  public async loadConfigurationFile(filePath: string): Promise<void> {
    try {
      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxConfigSize) {
        throw new Error(`Configuration file too large: ${filePath}`);
      }

      // Read and parse file
      const content = fs.readFileSync(filePath, 'utf8');
      const config = this.parseConfiguration(content, filePath);

      // Validate configuration
      const validation = this.validateConfiguration(config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration in ${filePath}: ${validation.errors.join(', ')}`);
      }

      // Store configuration
      const key = `${config.id}@${config.version}`;
      this.configs.set(key, config);

      logger.debug(`Loaded configuration: ${key}`);
    } catch (error) {
      logger.error(`Failed to load configuration file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Get workflow configuration
   */
  public getConfiguration(workflowId: string, version: string): IWorkflowConfig | undefined {
    const key = `${workflowId}@${version}`;
    return this.configs.get(key);
  }

  /**
   * Get all configurations
   */
  public getAllConfigurations(): Map<string, IWorkflowConfig> {
    return new Map(this.configs);
  }

  /**
   * Get configurations by environment
   */
  public getConfigurationsByEnvironment(environment: string): IWorkflowConfig[] {
    return Array.from(this.configs.values()).filter(config => {
      // Filter by environment-specific properties
      return config.properties?.environment === environment;
    });
  }

  /**
   * Update configuration
   */
  public async updateConfiguration(
    workflowId: string,
    version: string,
    config: Partial<IWorkflowConfig>,
    user?: string
  ): Promise<void> {
    try {
      const key = `${workflowId}@${version}`;
      const existingConfig = this.configs.get(key);

      if (!existingConfig) {
        throw new Error(`Configuration not found: ${key}`);
      }

      // Create backup if enabled
      if (this.backupConfigs) {
        await this.createBackup(key, existingConfig);
      }

      // Merge configurations
      const updatedConfig = { ...existingConfig, ...config };

      // Validate updated configuration
      const validation = this.validateConfiguration(updatedConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Update configuration
      this.configs.set(key, updatedConfig);

      // Save to file
      await this.saveConfigurationToFile(key, updatedConfig);

      // Emit change event
      this.emit('configurationChanged', {
        workflowId,
        version,
        changes: this.detectChanges(existingConfig, updatedConfig),
        timestamp: new Date(),
        user
      } as IConfigurationChangeEvent);

      logger.info(`Updated configuration: ${key}`);
    } catch (error) {
      logger.error(`Failed to update configuration: ${workflowId}@${version}`, error);
      throw error;
    }
  }

  /**
   * Add new configuration
   */
  public async addConfiguration(
    config: IWorkflowConfig,
    user?: string
  ): Promise<void> {
    try {
      const key = `${config.id}@${config.version}`;

      if (this.configs.has(key)) {
        throw new Error(`Configuration already exists: ${key}`);
      }

      // Validate configuration
      const validation = this.validateConfiguration(config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Add configuration
      this.configs.set(key, config);

      // Save to file
      await this.saveConfigurationToFile(key, config);

      // Emit change event
      this.emit('configurationAdded', {
        workflowId: config.id,
        version: config.version,
        changes: { added: [key], modified: [], removed: [] },
        timestamp: new Date(),
        user
      } as IConfigurationChangeEvent);

      logger.info(`Added configuration: ${key}`);
    } catch (error) {
      logger.error(`Failed to add configuration: ${config.id}@${config.version}`, error);
      throw error;
    }
  }

  /**
   * Remove configuration
   */
  public async removeConfiguration(
    workflowId: string,
    version: string,
    user?: string
  ): Promise<void> {
    try {
      const key = `${workflowId}@${version}`;
      const config = this.configs.get(key);

      if (!config) {
        throw new Error(`Configuration not found: ${key}`);
      }

      // Remove configuration
      this.configs.delete(key);

      // Remove file
      await this.removeConfigurationFile(key);

      // Emit change event
      this.emit('configurationRemoved', {
        workflowId,
        version,
        changes: { added: [], modified: [], removed: [key] },
        timestamp: new Date(),
        user
      } as IConfigurationChangeEvent);

      logger.info(`Removed configuration: ${key}`);
    } catch (error) {
      logger.error(`Failed to remove configuration: ${workflowId}@${version}`, error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  public validateConfiguration(config: IWorkflowConfig): IConfigurationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!config.id || !config.version) {
        errors.push('Missing required fields: id and version');
      }

      if (config.maxRetries < 0 || config.maxRetries > 10) {
        errors.push('maxRetries must be between 0 and 10');
      }

      if (config.timeout < 1000 || config.timeout > 3600000) {
        errors.push('timeout must be between 1000ms and 3600000ms');
      }

      if (!['low', 'normal', 'high', 'critical'].includes(config.priority)) {
        errors.push('Invalid priority value');
      }

      if (config.concurrency < 1 || config.concurrency > 100) {
        errors.push('concurrency must be between 1 and 100');
      }

      // Security validation
      if (config.security) {
        if (config.security.requireAuth && (!config.security.permissions || config.security.permissions.length === 0)) {
          warnings.push('requireAuth is true but no permissions specified');
        }
      }

      // Dependencies validation
      if (config.dependencies) {
        for (const dep of config.dependencies) {
          if (!this.configs.has(dep)) {
            warnings.push(`Dependency not found: ${dep}`);
          }
        }
      }

      // Environment-specific validation
      if (config.properties?.environment && !this.allowedEnvironments.includes(config.properties.environment)) {
        errors.push(`Invalid environment: ${config.properties.environment}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        schema: this.configSchema
      };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return {
        isValid: false,
        errors,
        warnings,
        schema: this.configSchema
      };
    }
  }

  /**
   * Reload configurations
   */
  public async reloadConfigurations(): Promise<void> {
    try {
      logger.info('Reloading configurations');
      
      // Clear existing configurations
      this.configs.clear();
      
      // Reload all configurations
      await this.loadConfigurations();
      
      logger.info('Configurations reloaded successfully');
    } catch (error) {
      logger.error('Failed to reload configurations', error);
      throw error;
    }
  }

  /**
   * Export configurations
   */
  public exportConfigurations(format: 'json' | 'yaml' = 'json'): string {
    try {
      const configs = Array.from(this.configs.values());
      
      if (format === 'yaml') {
        return yaml.dump(configs);
      } else {
        return JSON.stringify(configs, null, 2);
      }
    } catch (error) {
      logger.error('Failed to export configurations', error);
      throw error;
    }
  }

  /**
   * Get configuration statistics
   */
  public getConfigurationStats(): {
    totalConfigs: number;
    enabledConfigs: number;
    disabledConfigs: number;
    environments: string[];
    priorities: Record<string, number>;
  } {
    const configs = Array.from(this.configs.values());
    const environments = [...new Set(configs.map(c => c.properties?.environment).filter(Boolean))];
    const priorities = configs.reduce((acc, config) => {
      acc[config.priority] = (acc[config.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalConfigs: configs.length,
      enabledConfigs: configs.filter(c => c.enabled).length,
      disabledConfigs: configs.filter(c => !c.enabled).length,
      environments,
      priorities
    };
  }

  /**
   * Stop the configuration manager
   */
  public async stop(): Promise<void> {
    try {
      logger.info('Stopping ConfigurationManager');

      // Stop file watchers
      for (const [filePath, watcher] of this.fileWatchers) {
        if (watcher && typeof watcher.close === 'function') {
          watcher.close();
          logger.debug(`Stopped watching: ${filePath}`);
        }
      }
      this.fileWatchers.clear();

      this._isInitialized = false;
      logger.info('ConfigurationManager stopped');
    } catch (error) {
      logger.error('Failed to stop ConfigurationManager', error);
      throw error;
    }
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }

  // Private methods

  private async ensureConfigDirectory(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath, { recursive: true });
      logger.info(`Created config directory: ${this.configPath}`);
    }
  }

  private async getConfigFiles(): Promise<string[]> {
    const files: string[] = [];
    
    if (fs.existsSync(this.configPath)) {
      const items = fs.readdirSync(this.configPath);
      
      for (const item of items) {
        const filePath = path.join(this.configPath, item);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile() && (item.endsWith('.json') || item.endsWith('.yaml') || item.endsWith('.yml'))) {
          files.push(filePath);
        }
      }
    }
    
    return files;
  }

  private parseConfiguration(content: string, filePath: string): IWorkflowConfig {
    try {
      let config: any;
      
      if (filePath.endsWith('.json')) {
        config = JSON.parse(content);
      } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        config = yaml.load(content);
      } else {
        throw new Error(`Unsupported file format: ${filePath}`);
      }
      
      return config as IWorkflowConfig;
    } catch (error) {
      throw new Error(`Failed to parse configuration file: ${filePath} - ${error}`);
    }
  }

  private async setupHotReload(): Promise<void> {
    try {
      const configFiles = await this.getConfigFiles();
      
      for (const filePath of configFiles) {
        const watcher = fs.watch(filePath, (eventType, filename) => {
          if (eventType === 'change') {
            logger.info(`Configuration file changed: ${filePath}`);
            this.loadConfigurationFile(filePath).catch(error => {
              logger.error(`Failed to reload configuration: ${filePath}`, error);
            });
          }
        });
        
        this.fileWatchers.set(filePath, watcher);
        logger.debug(`Started watching: ${filePath}`);
      }
    } catch (error) {
      logger.error('Failed to setup hot reload', error);
      throw error;
    }
  }

  private async createBackup(key: string, config: IWorkflowConfig): Promise<void> {
    try {
      const backupPath = path.join(this.configPath, 'backups');
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupPath, `${key}-${timestamp}.json`);
      
      fs.writeFileSync(backupFile, JSON.stringify(config, null, 2));
      logger.debug(`Created backup: ${backupFile}`);
    } catch (error) {
      logger.warn(`Failed to create backup for ${key}`, error);
    }
  }

  private async saveConfigurationToFile(key: string, config: IWorkflowConfig): Promise<void> {
    try {
      const fileName = `${key.replace('@', '-')}.json`;
      const filePath = path.join(this.configPath, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      logger.debug(`Saved configuration to: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to save configuration: ${key}`, error);
      throw error;
    }
  }

  private async removeConfigurationFile(key: string): Promise<void> {
    try {
      const fileName = `${key.replace('@', '-')}.json`;
      const filePath = path.join(this.configPath, fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Removed configuration file: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to remove configuration file: ${key}`, error);
      throw error;
    }
  }

  private detectChanges(oldConfig: IWorkflowConfig, newConfig: IWorkflowConfig): {
    added: string[];
    modified: string[];
    removed: string[];
  } {
    const changes = {
      added: [] as string[],
      modified: [] as string[],
      removed: [] as string[]
    };

    // Compare configurations
    const oldKeys = Object.keys(oldConfig);
    const newKeys = Object.keys(newConfig);

    // Find added keys
    for (const key of newKeys) {
      if (!oldKeys.includes(key)) {
        changes.added.push(key);
      } else if (JSON.stringify(oldConfig[key as keyof IWorkflowConfig]) !== JSON.stringify(newConfig[key as keyof IWorkflowConfig])) {
        changes.modified.push(key);
      }
    }

    // Find removed keys
    for (const key of oldKeys) {
      if (!newKeys.includes(key)) {
        changes.removed.push(key);
      }
    }

    return changes;
  }
} 