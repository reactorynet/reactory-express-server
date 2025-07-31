import Reactory from '@reactory/reactory-core';
import { service } from '@reactory/server-core/application/decorators/service';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Redis Service - Provides read/write access to Redis database
 * 
 * This service wraps the ioredis client and provides a standardized interface
 * for Redis operations including get, set, delete, batch operations, and session management.
 */
@service({
  id: 'core.RedisService@1.0.0',
  nameSpace: 'core',
  name: 'RedisService',
  version: '1.0.0',
  description: 'A service class that provides Redis database read/write operations',
  serviceType: 'data',
  lifeCycle: 'singleton',
  dependencies: [],
  roles: ['SYSTEM', 'USER']
})
export class RedisService implements Reactory.Service.IReactoryService {
  
  name: string = 'RedisService';
  nameSpace: string = 'core';
  version: string = '1.0.0';
  description?: string = 'Redis database service for read/write operations';
  tags?: string[] = ['redis', 'database', 'cache', 'session'];

  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;

  private client: Redis;
  private isConnected: boolean = false;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
    
    const redisConfig: RedisOptions = {
      host: process.env.REACTORY_REDIS_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_REDIS_PORT || '6379', 10),
      password: process.env.REACTORY_REDIS_PASSWORD || 'reactory',
      db: parseInt(process.env.REACTORY_REDIS_DB || '0', 10),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    this.client = new Redis(redisConfig);
    this.setupEventHandlers();
  }

  /**
   * Setup Redis client event handlers
   */
  private setupEventHandlers(): void {
    const { log, error } = this.context;

    this.client.on('connect', () => {
      log('Redis client connected', {}, 'info', 'core.RedisService');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      log('Redis client ready', {}, 'info', 'core.RedisService');
    });

    this.client.on('error', (err) => {
      error('Redis client error', err, 'core.RedisService');
      this.isConnected = false;
    });

    this.client.on('close', () => {
      log('Redis client connection closed', {}, 'info', 'core.RedisService');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      log('Redis client reconnecting', {}, 'info', 'core.RedisService');
    });
  }

  /**
   * Check if Redis connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.context.error('Redis health check failed', error, 'core.RedisService');
      return false;
    }
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.context.error(`Failed to get key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Get a parsed JSON value from Redis
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.context.error(`Failed to get JSON key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Set a value in Redis
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    try {
      if (ttlSeconds) {
        return await this.client.setex(key, ttlSeconds, value);
      }
      return await this.client.set(key, value);
    } catch (error) {
      this.context.error(`Failed to set key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Set a JSON value in Redis
   */
  async setJSON<T = any>(key: string, value: T, ttlSeconds?: number): Promise<'OK'> {
    try {
      const jsonValue = JSON.stringify(value);
      return await this.set(key, jsonValue, ttlSeconds);
    } catch (error) {
      this.context.error(`Failed to set JSON key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      this.context.error(`Failed to delete key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Delete multiple keys from Redis
   */
  async delMultiple(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (error) {
      this.context.error(`Failed to delete keys: ${keys.join(', ')}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Check if a key exists in Redis
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.context.error(`Failed to check existence of key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      this.context.error(`Failed to set expiration for key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.context.error(`Failed to get TTL for key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.context.error(`Failed to get keys with pattern: ${pattern}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      if (keys.length === 0) return [];
      return await this.client.mget(...keys);
    } catch (error) {
      this.context.error(`Failed to get multiple keys: ${keys.join(', ')}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Set multiple key-value pairs at once
   */
  async mset(keyValuePairs: Record<string, string>): Promise<'OK'> {
    try {
      const pairs: string[] = [];
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        pairs.push(key, value);
      });
      return await this.client.mset(...pairs);
    } catch (error) {
      this.context.error('Failed to set multiple key-value pairs', error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.context.error(`Failed to increment key: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Increment a numeric value by a specific amount
   */
  async incrby(key: string, increment: number): Promise<number> {
    try {
      return await this.client.incrby(key, increment);
    } catch (error) {
      this.context.error(`Failed to increment key: ${key} by ${increment}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Hash operations - set field in hash
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hset(key, field, value);
    } catch (error) {
      this.context.error(`Failed to set hash field: ${key}.${field}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Hash operations - get field from hash
   */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      this.context.error(`Failed to get hash field: ${key}.${field}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Hash operations - get all fields and values from hash
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      this.context.error(`Failed to get all hash fields: ${key}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Hash operations - delete field from hash
   */
  async hdel(key: string, field: string): Promise<number> {
    try {
      return await this.client.hdel(key, field);
    } catch (error) {
      this.context.error(`Failed to delete hash field: ${key}.${field}`, error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Execute multiple commands in a pipeline
   */
  async pipeline(commands: Array<[string, ...any[]]>): Promise<any[]> {
    try {
      const pipeline = this.client.pipeline();
      commands.forEach(([command, ...args]) => {
        (pipeline as any)[command](...args);
      });
      const results = await pipeline.exec();
      return results?.map(([err, result]) => {
        if (err) throw err;
        return result;
      }) || [];
    } catch (error) {
      this.context.error('Failed to execute pipeline commands', error, 'core.RedisService');
      throw error;
    }
  }

  /**
   * Get Redis client instance for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Service lifecycle methods
   */
  async onStartup(): Promise<void> {
    const { log } = this.context;
    log('Starting Redis service', {}, 'info', 'core.RedisService');
    
    try {
      await this.client.connect();
      const isHealthy = await this.isHealthy();
      if (isHealthy) {
        log('Redis service started successfully', {}, 'info', 'core.RedisService');
      } else {
        throw new Error('Redis health check failed after connection');
      }
    } catch (error) {
      this.context.error('Failed to start Redis service', error, 'core.RedisService');
      throw error;
    }
  }

  async onShutdown(): Promise<void> {
    const { log } = this.context;
    log('Shutting down Redis service', {}, 'info', 'core.RedisService');
    
    try {
      await this.client.quit();
      log('Redis service shut down successfully', {}, 'info', 'core.RedisService');
    } catch (error) {
      this.context.error('Failed to shut down Redis service gracefully', error, 'core.RedisService');
    }
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): void {
    this.context = context;
  }

  toString(includeVersion?: boolean): string {
    return `${this.nameSpace}.${this.name}${includeVersion ? '@' + this.version : ''}`;
  }
}

export default RedisService;
