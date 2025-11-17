import { RedisService } from '../RedisService';
import Redis from 'ioredis';

// Mock Redis client
jest.mock('ioredis');

describe('RedisService', () => {
  let redisService: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockContext: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Redis client
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue('OK'),
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      keys: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      incr: jest.fn(),
      incrby: jest.fn(),
      hset: jest.fn(),
      hget: jest.fn(),
      hgetall: jest.fn(),
      hdel: jest.fn(),
      pipeline: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedisClient);

    // Create mock context
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Create service instance
    redisService = new RedisService({}, mockContext);
  });

  describe('constructor', () => {
    it('should create RedisService instance with correct configuration', () => {
      expect(redisService).toBeInstanceOf(RedisService);
      expect(redisService.name).toBe('RedisService');
      expect(redisService.nameSpace).toBe('core');
      expect(redisService.version).toBe('1.0.0');
    });

    it('should initialize Redis client with environment variables', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: process.env.REACTORY_REDIS_HOST || 'localhost',
        port: parseInt(process.env.REACTORY_REDIS_PORT || '6379', 10),
        password: process.env.REACTORY_REDIS_PASSWORD || 'reactory',
        db: parseInt(process.env.REACTORY_REDIS_DB || '0', 10),
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    });

    it('should setup event handlers', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('isHealthy', () => {
    it('should return true when ping succeeds', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');
      
      const result = await redisService.isHealthy();
      
      expect(result).toBe(true);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should return false when ping fails', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));
      
      const result = await redisService.isHealthy();
      
      expect(result).toBe(false);
      expect(mockContext.error).toHaveBeenCalledWith(
        'Redis health check failed',
        expect.any(Error),
        'core.RedisService'
      );
    });
  });

  describe('get', () => {
    it('should get value successfully', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedisClient.get.mockResolvedValue(value);

      const result = await redisService.get(key);

      expect(result).toBe(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisService.get(key);

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should handle errors', async () => {
      const key = 'test-key';
      const error = new Error('Redis error');
      mockRedisClient.get.mockRejectedValue(error);

      await expect(redisService.get(key)).rejects.toThrow('Redis error');
      expect(mockContext.error).toHaveBeenCalledWith(
        `Failed to get key: ${key}`,
        error,
        'core.RedisService'
      );
    });
  });

  describe('getJSON', () => {
    it('should get and parse JSON value successfully', async () => {
      const key = 'test-json-key';
      const value = { name: 'test', count: 42 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await redisService.getJSON(key);

      expect(result).toEqual(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisService.getJSON(key);

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      const key = 'invalid-json-key';
      mockRedisClient.get.mockResolvedValue('invalid json');

      await expect(redisService.getJSON(key)).rejects.toThrow();
      expect(mockContext.error).toHaveBeenCalledWith(
        `Failed to get JSON key: ${key}`,
        expect.any(Error),
        'core.RedisService'
      );
    });
  });

  describe('set', () => {
    it('should set value successfully without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await redisService.set(key, value);

      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
    });

    it('should set value successfully with TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 3600;
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await redisService.set(key, value, ttl);

      expect(result).toBe('OK');
      expect(mockRedisClient.setex).toHaveBeenCalledWith(key, ttl, value);
    });

    it('should handle errors', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const error = new Error('Redis error');
      mockRedisClient.set.mockRejectedValue(error);

      await expect(redisService.set(key, value)).rejects.toThrow('Redis error');
      expect(mockContext.error).toHaveBeenCalledWith(
        `Failed to set key: ${key}`,
        error,
        'core.RedisService'
      );
    });
  });

  describe('setJSON', () => {
    it('should set JSON value successfully', async () => {
      const key = 'test-json-key';
      const value = { name: 'test', count: 42 };
      const ttl = 3600;
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await redisService.setJSON(key, value, ttl);

      expect(result).toBe('OK');
      expect(mockRedisClient.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
    });
  });

  describe('del', () => {
    it('should delete key successfully', async () => {
      const key = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      const result = await redisService.del(key);

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should handle errors', async () => {
      const key = 'test-key';
      const error = new Error('Redis error');
      mockRedisClient.del.mockRejectedValue(error);

      await expect(redisService.del(key)).rejects.toThrow('Redis error');
      expect(mockContext.error).toHaveBeenCalledWith(
        `Failed to delete key: ${key}`,
        error,
        'core.RedisService'
      );
    });
  });

  describe('delMultiple', () => {
    it('should delete multiple keys successfully', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.del.mockResolvedValue(3);

      const result = await redisService.delMultiple(keys);

      expect(result).toBe(3);
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('should return 0 for empty keys array', async () => {
      const result = await redisService.delMultiple([]);

      expect(result).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      const key = 'existing-key';
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await redisService.exists(key);

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
    });

    it('should return false when key does not exist', async () => {
      const key = 'non-existing-key';
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await redisService.exists(key);

      expect(result).toBe(false);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
    });
  });

  describe('hash operations', () => {
    describe('hset', () => {
      it('should set hash field successfully', async () => {
        const key = 'hash-key';
        const field = 'field1';
        const value = 'value1';
        mockRedisClient.hset.mockResolvedValue(1);

        const result = await redisService.hset(key, field, value);

        expect(result).toBe(1);
        expect(mockRedisClient.hset).toHaveBeenCalledWith(key, field, value);
      });
    });

    describe('hget', () => {
      it('should get hash field successfully', async () => {
        const key = 'hash-key';
        const field = 'field1';
        const value = 'value1';
        mockRedisClient.hget.mockResolvedValue(value);

        const result = await redisService.hget(key, field);

        expect(result).toBe(value);
        expect(mockRedisClient.hget).toHaveBeenCalledWith(key, field);
      });
    });

    describe('hgetall', () => {
      it('should get all hash fields successfully', async () => {
        const key = 'hash-key';
        const hashData = { field1: 'value1', field2: 'value2' };
        mockRedisClient.hgetall.mockResolvedValue(hashData);

        const result = await redisService.hgetall(key);

        expect(result).toEqual(hashData);
        expect(mockRedisClient.hgetall).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('pipeline', () => {
    it('should execute pipeline commands successfully', async () => {
      const commands: Array<[string, ...any[]]> = [
        ['set', 'key1', 'value1'],
        ['set', 'key2', 'value2'],
        ['get', 'key1']
      ];

      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'],
          [null, 'OK'],
          [null, 'value1']
        ])
      };

      mockRedisClient.pipeline.mockReturnValue(mockPipeline as any);

      const result = await redisService.pipeline(commands);

      expect(result).toEqual(['OK', 'OK', 'value1']);
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledWith('key1', 'value1');
      expect(mockPipeline.set).toHaveBeenCalledWith('key2', 'value2');
      expect(mockPipeline.get).toHaveBeenCalledWith('key1');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('lifecycle methods', () => {
    describe('onStartup', () => {
      it('should start service successfully', async () => {
        mockRedisClient.connect.mockResolvedValue(undefined);
        mockRedisClient.ping.mockResolvedValue('PONG');

        await redisService.onStartup();

        expect(mockRedisClient.connect).toHaveBeenCalled();
        expect(mockRedisClient.ping).toHaveBeenCalled();
        expect(mockContext.log).toHaveBeenCalledWith(
          'Starting Redis service',
          {},
          'info',
          'core.RedisService'
        );
        expect(mockContext.log).toHaveBeenCalledWith(
          'Redis service started successfully',
          {},
          'info',
          'core.RedisService'
        );
      });

      it('should handle startup errors', async () => {
        const error = new Error('Connection failed');
        mockRedisClient.connect.mockRejectedValue(error);

        await expect(redisService.onStartup()).rejects.toThrow('Connection failed');
        expect(mockContext.error).toHaveBeenCalledWith(
          'Failed to start Redis service',
          error,
          'core.RedisService'
        );
      });
    });

    describe('onShutdown', () => {
      it('should shutdown service successfully', async () => {
        mockRedisClient.quit.mockResolvedValue('OK');

        await redisService.onShutdown();

        expect(mockRedisClient.quit).toHaveBeenCalled();
        expect(mockContext.log).toHaveBeenCalledWith(
          'Shutting down Redis service',
          {},
          'info',
          'core.RedisService'
        );
        expect(mockContext.log).toHaveBeenCalledWith(
          'Redis service shut down successfully',
          {},
          'info',
          'core.RedisService'
        );
      });

      it('should handle shutdown errors gracefully', async () => {
        const error = new Error('Shutdown failed');
        mockRedisClient.quit.mockRejectedValue(error);

        await redisService.onShutdown();

        expect(mockContext.error).toHaveBeenCalledWith(
          'Failed to shut down Redis service gracefully',
          error,
          'core.RedisService'
        );
      });
    });
  });

  describe('utility methods', () => {
    it('should return Redis client instance', () => {
      const client = redisService.getClient();
      expect(client).toBe(mockRedisClient);
    });

    it('should return execution context', () => {
      const context = redisService.getExecutionContext();
      expect(context).toBe(mockContext);
    });

    it('should set execution context', () => {
      const newContext = { log: jest.fn(), error: jest.fn() };
      redisService.setExecutionContext(newContext);
      expect(redisService.getExecutionContext()).toBe(newContext);
    });

    it('should return string representation', () => {
      expect(redisService.toString()).toBe('core.RedisService');
      expect(redisService.toString(true)).toBe('core.RedisService@1.0.0');
    });
  });
});
