import { RedisService } from '../RedisService';
import Redis from 'ioredis';

jest.mock('ioredis');

const mockRedisClient = {
  on: jest.fn(),
  ping: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  incr: jest.fn(),
  incrby: jest.fn(),
  hset: jest.fn(),
  hget: jest.fn(),
  hgetall: jest.fn(),
  hdel: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
  mset: jest.fn(),
  pipeline: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
} as any;

(Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedisClient);

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
  colors: { green: (s: string) => s, red: (s: string) => s },
} as any;

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient.on.mockReturnThis();
    service = new RedisService({}, mockContext);
  });

  describe('initialization', () => {
    it('creates Redis client with default config', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
          password: 'reactory',
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })
      );
    });

    it('sets up event handlers', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });

    it('initializes with correct service metadata', () => {
      expect(service.name).toBe('RedisService');
      expect(service.nameSpace).toBe('core');
      expect(service.version).toBe('1.0.0');
    });
  });

  describe('health check', () => {
    it('returns true on successful ping', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await service.isHealthy();

      expect(result).toBe(true);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('returns false on ping failure', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.isHealthy();

      expect(result).toBe(false);
      expect(mockContext.error).toHaveBeenCalledWith(
        'Redis health check failed',
        expect.any(Error),
        'core.RedisService'
      );
    });
  });

  describe('string operations', () => {
    it('gets a value', async () => {
      mockRedisClient.get.mockResolvedValue('test-value');

      const result = await service.get('test-key');

      expect(result).toBe('test-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('sets a value', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.set('test-key', 'test-value');

      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('sets a value with TTL', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await service.set('test-key', 'test-value', 60);

      expect(result).toBe('OK');
      expect(mockRedisClient.setex).toHaveBeenCalledWith('test-key', 60, 'test-value');
    });

    it('deletes a key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.del('test-key');

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('deletes multiple keys', async () => {
      mockRedisClient.del.mockResolvedValue(2);

      const result = await service.delMultiple(['key1', 'key2']);

      expect(result).toBe(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('checks key existence', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
    });
  });

  describe('JSON operations', () => {
    it('gets and parses JSON', async () => {
      const jsonData = { message: 'hello', count: 42 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(jsonData));

      const result = await service.getJSON('json-key');

      expect(result).toEqual(jsonData);
    });

    it('sets and stringifies JSON', async () => {
      const jsonData = { message: 'hello', count: 42 };
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await service.setJSON('json-key', jsonData, 120);

      expect(result).toBe('OK');
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'json-key',
        120,
        JSON.stringify(jsonData)
      );
    });

    it('handles null JSON value', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getJSON('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('expiration', () => {
    it('sets TTL for a key', async () => {
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.expire('test-key', 60);

      expect(result).toBe(true);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 60);
    });

    it('gets TTL for a key', async () => {
      mockRedisClient.ttl.mockResolvedValue(45);

      const result = await service.ttl('test-key');

      expect(result).toBe(45);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('test-key');
    });
  });

  describe('increment operations', () => {
    it('increments a key', async () => {
      mockRedisClient.incr.mockResolvedValue(5);

      const result = await service.incr('counter');

      expect(result).toBe(5);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('counter');
    });

    it('increments by specific amount', async () => {
      mockRedisClient.incrby.mockResolvedValue(25);

      const result = await service.incrby('counter', 20);

      expect(result).toBe(25);
      expect(mockRedisClient.incrby).toHaveBeenCalledWith('counter', 20);
    });
  });

  describe('hash operations', () => {
    it('sets hash field', async () => {
      mockRedisClient.hset.mockResolvedValue(1);

      const result = await service.hset('hash-key', 'field', 'value');

      expect(result).toBe(1);
      expect(mockRedisClient.hset).toHaveBeenCalledWith('hash-key', 'field', 'value');
    });

    it('gets hash field', async () => {
      mockRedisClient.hget.mockResolvedValue('field-value');

      const result = await service.hget('hash-key', 'field');

      expect(result).toBe('field-value');
      expect(mockRedisClient.hget).toHaveBeenCalledWith('hash-key', 'field');
    });

    it('gets all hash fields', async () => {
      const hashData = { field1: 'value1', field2: 'value2' };
      mockRedisClient.hgetall.mockResolvedValue(hashData);

      const result = await service.hgetall('hash-key');

      expect(result).toEqual(hashData);
      expect(mockRedisClient.hgetall).toHaveBeenCalledWith('hash-key');
    });

    it('deletes hash field', async () => {
      mockRedisClient.hdel.mockResolvedValue(1);

      const result = await service.hdel('hash-key', 'field');

      expect(result).toBe(1);
      expect(mockRedisClient.hdel).toHaveBeenCalledWith('hash-key', 'field');
    });
  });

  describe('pattern operations', () => {
    it('gets keys matching pattern', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedisClient.keys.mockResolvedValue(keys);

      const result = await service.keys('key*');

      expect(result).toEqual(keys);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('key*');
    });

    it('gets multiple values', async () => {
      mockRedisClient.mget.mockResolvedValue(['value1', 'value2', null]);

      const result = await service.mget(['key1', 'key2', 'key3']);

      expect(result).toEqual(['value1', 'value2', null]);
      expect(mockRedisClient.mget).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('handles empty keys for mget', async () => {
      const result = await service.mget([]);

      expect(result).toEqual([]);
      expect(mockRedisClient.mget).not.toHaveBeenCalled();
    });

    it('sets multiple key-value pairs', async () => {
      mockRedisClient.mset.mockResolvedValue('OK');

      const result = await service.mset({ key1: 'value1', key2: 'value2' });

      expect(result).toBe('OK');
      expect(mockRedisClient.mset).toHaveBeenCalledWith('key1', 'value1', 'key2', 'value2');
    });
  });

  describe('leader election', () => {
    it('acquires leadership via set NX', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const acquired = await service.tryAcquireLeadership(30);

      expect(acquired).toBe(true);
      expect(service.isCacheLeader()).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'reactory:leader:cache',
        expect.any(String),
        'EX',
        30,
        'NX'
      );
    });

    it('fails to acquire leadership if already held', async () => {
      mockRedisClient.set.mockResolvedValue(null);

      const acquired = await service.tryAcquireLeadership(30);

      expect(acquired).toBe(false);
      expect(service.isCacheLeader()).toBe(false);
    });

    it('reports leader status', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      await service.tryAcquireLeadership(30);

      expect(service.isCacheLeader()).toBe(true);
    });
  });

  describe('error handling', () => {
    it('catches and logs get errors', async () => {
      const error = new Error('Get failed');
      mockRedisClient.get.mockRejectedValue(error);

      await expect(service.get('test-key')).rejects.toThrow('Get failed');
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('catches and logs set errors', async () => {
      const error = new Error('Set failed');
      mockRedisClient.setex.mockRejectedValue(error);

      await expect(service.set('test-key', 'value', 60)).rejects.toThrow('Set failed');
      expect(mockContext.error).toHaveBeenCalled();
    });

    it('catches and logs incr errors', async () => {
      const error = new Error('Incr failed');
      mockRedisClient.incr.mockRejectedValue(error);

      await expect(service.incr('counter')).rejects.toThrow('Incr failed');
      expect(mockContext.error).toHaveBeenCalled();
    });
  });

  describe('service lifecycle', () => {
    it('connects on startup', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');

      await service.onStartup();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('attempts leadership acquisition on successful startup', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockResolvedValue('PONG');
      mockRedisClient.set.mockResolvedValue('OK');

      await service.onStartup();

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'reactory:leader:cache',
        expect.any(String),
        'EX',
        expect.any(Number),
        'NX'
      );
    });

    it('throws on health check failure during startup', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.ping.mockRejectedValue(new Error('Ping failed'));

      await expect(service.onStartup()).rejects.toThrow('Redis health check failed after connection');
    });

    it('disconnects on shutdown', async () => {
      mockRedisClient.quit.mockResolvedValue(undefined);

      await service.onShutdown();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it('logs errors on failed shutdown', async () => {
      const error = new Error('Quit failed');
      mockRedisClient.quit.mockRejectedValue(error);

      await service.onShutdown();

      expect(mockContext.error).toHaveBeenCalledWith(
        'Failed to shut down Redis service gracefully',
        error,
        'core.RedisService'
      );
    });
  });

  describe('toString', () => {
    it('returns service identifier', () => {
      const identifier = service.toString();
      expect(identifier).toBe('core.RedisService');
    });

    it('includes version when requested', () => {
      const identifier = service.toString(true);
      expect(identifier).toBe('core.RedisService@1.0.0');
    });
  });
});
