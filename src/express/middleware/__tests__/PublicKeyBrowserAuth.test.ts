import ReactoryClientFromRequest from '../../utils/ReactoryClientFromRequest';
import { ReactoryClientAuthenticationMiddleware } from '../ReactoryClient';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import PasswordHasher from '@reactory/server-core/authentication/password/PasswordHasher';

describe('WP-A4: Tenant secret out of the browser bundle - Public Key & Origin Binding', () => {
  let mockClient: any;
  const clientPublicKey = 'pk_test_public_key_abc123';
  const clientSecret = 'super_secret_server_password';
  let hashedSecret: string;

  beforeAll(async () => {
    hashedSecret = await PasswordHasher.hash(clientSecret, 1000);
  });

  beforeEach(() => {
    mockClient = new ReactoryClient({
      key: 'tenant-test',
      name: 'Tenant Test',
      password: hashedSecret,
      publicKey: clientPublicKey,
      browserAuth: 'origin',
      whitelist: ['https://app.tenant-test.com', 'https://portal.tenant-test.com'],
    });

    mockClient.save = jest.fn().mockResolvedValue(mockClient);

    const mockQuery = {
      then: (fn?: any) => Promise.resolve(mockClient).then(fn),
      exec: () => Promise.resolve(mockClient),
    };

    jest.spyOn(ReactoryClient, 'findOne').mockImplementation((filter: any) => {
      if (filter && filter.key === 'tenant-test') {
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

  describe('ReactoryClientFromRequest with public key and origin binding', () => {
    it('resolves tenant when public key is sent from a whitelisted Origin', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'tenant-test',
          'x-client-public-key': clientPublicKey,
          origin: 'https://app.tenant-test.com',
        },
        params: {},
        query: {},
        originalUrl: '/graphql',
        method: 'POST',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).not.toBeNull();
      expect(resolved.key).toBe('tenant-test');
    });

    it('resolves tenant when public key is sent with whitelisted Referer', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'tenant-test',
          'x-client-public-key': clientPublicKey,
          referer: 'https://portal.tenant-test.com/dashboard',
        },
        params: {},
        query: {},
        originalUrl: '/graphql',
        method: 'POST',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).not.toBeNull();
      expect(resolved.key).toBe('tenant-test');
    });

    it('rejects with null when public key is sent from a non-whitelisted Origin', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'tenant-test',
          'x-client-public-key': clientPublicKey,
          origin: 'https://evil-attacker.com',
        },
        params: {},
        query: {},
        originalUrl: '/graphql',
        method: 'POST',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).toBeNull();
    });

    it('rejects with null when public key is invalid', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'tenant-test',
          'x-client-public-key': 'pk_wrong_key',
          origin: 'https://app.tenant-test.com',
        },
        params: {},
        query: {},
        originalUrl: '/graphql',
        method: 'POST',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).toBeNull();
    });

    it('rejects public key when tenant has browserAuth set to secret', async () => {
      mockClient.browserAuth = 'secret';

      const req: any = {
        headers: {
          'x-client-key': 'tenant-test',
          'x-client-public-key': clientPublicKey,
          origin: 'https://app.tenant-test.com',
        },
        params: {},
        query: {},
        originalUrl: '/graphql',
        method: 'POST',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).toBeNull();
    });

    it('server-to-server request with secret still works', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'tenant-test',
          'x-client-pwd': clientSecret,
        },
        params: {},
        query: {},
        originalUrl: '/graphql',
        method: 'POST',
      };

      const resolved = await ReactoryClientFromRequest(req);
      expect(resolved).not.toBeNull();
      expect(resolved.key).toBe('tenant-test');
    });
  });

  describe('ReactoryClientAuthenticationMiddleware with public key', () => {
    it('authenticates request with x-client-public-key from whitelisted origin in middleware', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'tenant-test',
          'x-client-public-key': clientPublicKey,
          origin: 'https://app.tenant-test.com',
          accept: 'application/json',
        },
        params: {},
        query: {},
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
      expect(req.partner.key).toBe('tenant-test');
    });

    it('returns 401 when x-client-public-key is from a non-whitelisted origin in middleware', async () => {
      const req: any = {
        headers: {
          'x-client-key': 'tenant-test',
          'x-client-public-key': clientPublicKey,
          origin: 'https://attacker.com',
          accept: 'application/json',
        },
        params: {},
        query: {},
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
});
