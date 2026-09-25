import ReactoryClientFromRequest from '../../utils/ReactoryClientFromRequest';
import { ReactoryClientAuthenticationMiddleware } from '../ReactoryClient';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import PasswordHasher from '@reactory/server-core/authentication/password/PasswordHasher';
import { mintServiceKey, listServiceKeys, disableServiceKey } from '@reactory/server-modules/reactory-core/cli/service-keys/ServiceKeysCli';

describe('WP-A2: Service Keys and x-reactory-pass bypass removal', () => {
  let mockClient: any;
  let rawServiceKey: string;
  let hashedServiceKey: string;

  beforeAll(async () => {
    rawServiceKey = 'sk_test_secret_service_key_12345';
    hashedServiceKey = await PasswordHasher.hash(rawServiceKey, 1000);
  });

  beforeEach(() => {
    mockClient = new ReactoryClient({
      key: 'test-tenant',
      name: 'Test Tenant',
      password: 'pbkdf2$sha512$1000$abcd$ef01',
      salt: '1234567890abcdef1234567890abcdef',
      serviceKeys: [
        {
          label: 'ci-runner',
          keyHash: hashedServiceKey,
          createdAt: new Date(),
          disabled: false,
        },
        {
          label: 'disabled-key',
          keyHash: hashedServiceKey,
          createdAt: new Date(),
          disabled: true,
        },
      ],
    });

    mockClient.save = jest.fn().mockResolvedValue(mockClient);

    const mockQuery = {
      then: (fn?: any) => Promise.resolve(mockClient).then(fn),
      exec: () => Promise.resolve(mockClient),
    };

    jest.spyOn(ReactoryClient, 'findOne').mockImplementation((filter: any) => {
      if (filter && filter.key === 'test-tenant') {
        return mockQuery as any;
      }
      return {
        then: (fn?: any) => Promise.resolve(null).then(fn),
        exec: () => Promise.resolve(null),
      } as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('x-reactory-pass bypass removal in ReactoryClientFromRequest', () => {
    it('returns null when x-reactory-pass header is used without password', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'test-tenant',
          'x-reactory-pass': `${mockClient.password}+${mockClient.salt}`,
        },
        params: {},
        query: {},
        originalUrl: '/test',
        method: 'GET',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).toBeNull();
    });

    it('resolves tenant when valid x-service-key header is supplied', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'test-tenant',
          'x-service-key': rawServiceKey,
        },
        params: {},
        query: {},
        originalUrl: '/test',
        method: 'GET',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).not.toBeNull();
      expect(resolved.key).toBe('test-tenant');
    });

    it('rejects when disabled service key is supplied', async () => {
      // Modify mockClient to only have the disabled key
      mockClient.serviceKeys[0].disabled = true;

      const req: any = {
        headers: {
          'x-client-key': 'test-tenant',
          'x-service-key': rawServiceKey,
        },
        params: {},
        query: {},
        originalUrl: '/test',
        method: 'GET',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).toBeNull();
    });

    it('rejects when invalid service key is supplied', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'test-tenant',
          'x-service-key': 'sk_wrong_key',
        },
        params: {},
        query: {},
        originalUrl: '/test',
        method: 'GET',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).toBeNull();
    });
  });

  describe('ReactoryClientMiddleware with service keys', () => {
    it('resolves tenant via x-service-key header in middleware', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'test-tenant',
          'x-service-key': rawServiceKey,
          accept: 'application/json',
        },
        query: {},
        params: {},
        context: {},
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await new Promise<void>((resolve) => {
        ReactoryClientAuthenticationMiddleware(req, res, () => {
          next();
          resolve();
        });
      });

      expect(next).toHaveBeenCalled();
      expect(req.partner).toBeDefined();
      expect(req.partner.key).toBe('test-tenant');
    });

    it('returns 401 when invalid service key is passed to middleware', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'test-tenant',
          'x-service-key': 'sk_wrong',
          accept: 'application/json',
        },
        query: {},
        params: {},
        context: {},
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await new Promise<void>((resolve) => {
        res.send = jest.fn(() => resolve());
        ReactoryClientAuthenticationMiddleware(req, res, next);
      });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('ServiceKeys CLI functions', () => {
    it('mintServiceKey creates and hashes key on client', async () => {
      const result = await mintServiceKey('test-tenant', 'new-key');
      expect(result.rawKey).toMatch(/^sk_[0-9a-f]{48}$/);
      expect(result.label).toBe('new-key');
      expect(mockClient.save).toHaveBeenCalled();

      // Verify the new key was stored hashed
      const newKeyEntry = mockClient.serviceKeys[mockClient.serviceKeys.length - 1];
      expect(newKeyEntry.label).toBe('new-key');
      expect(newKeyEntry.keyHash).toMatch(/^pbkdf2\$sha512\$/);
    });

    it('listServiceKeys lists tenant keys without exposing hash', async () => {
      const list = await listServiceKeys('test-tenant');
      expect(list.length).toBe(2);
      expect(list[0].label).toBe('ci-runner');
      expect(list[0].disabled).toBe(false);
      expect(list[1].label).toBe('disabled-key');
      expect(list[1].disabled).toBe(true);
      expect((list[0] as any).keyHash).toBeUndefined();
    });

    it('disableServiceKey disables the specified key', async () => {
      expect(mockClient.serviceKeys[0].disabled).toBe(false);
      await disableServiceKey('test-tenant', 'ci-runner');
      expect(mockClient.serviceKeys[0].disabled).toBe(true);
      expect(mockClient.save).toHaveBeenCalled();
    });
  });
});
