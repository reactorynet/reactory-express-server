import AnonStrategy, { IAnonUser } from '../AnonStrategy';

describe('Anonymous Strategy', () => {
  let mockReq: any;
  let mockOptions: any;

  beforeEach(() => {
    mockReq = {};
    mockOptions = {};
  });

  describe('Strategy Properties', () => {
    it('should have correct name', () => {
      expect(AnonStrategy.name).toBe('anonymous');
    });
  });

  describe('Authentication', () => {
    it('should authenticate user as anonymous', () => {
      const successSpy = jest.fn();
      const failSpy = jest.fn();
      const errorSpy = jest.fn();
      const redirectSpy = jest.fn();

      // Mock the strategy methods
      AnonStrategy.success = successSpy;
      AnonStrategy.fail = failSpy;
      AnonStrategy.error = errorSpy;
      AnonStrategy.redirect = redirectSpy;

      // Call authenticate
      AnonStrategy.authenticate.call(AnonStrategy);

      // Verify success was called with anonymous user
      expect(successSpy).toHaveBeenCalledTimes(1);
      expect(successSpy).toHaveBeenCalledWith(expect.objectContaining({
        id: -1,
        firstName: 'Guest',
        lastName: 'User',
        roles: ['ANON'],
        memberships: [],
        avatar: null,
        anon: true,
      }));

      // Verify other methods were not called
      expect(failSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(redirectSpy).not.toHaveBeenCalled();
    });
  });

  describe('Anonymous User', () => {
    it('should have correct anonymous user properties', () => {
      const successSpy = jest.fn();
      AnonStrategy.success = successSpy;

      AnonStrategy.authenticate.call(AnonStrategy);

      const anonUser = successSpy.mock.calls[0][0] as IAnonUser;

      expect(anonUser.id).toBe(-1);
      expect(anonUser.firstName).toBe('Guest');
      expect(anonUser.lastName).toBe('User');
      expect(anonUser.roles).toEqual(['ANON']);
      expect(anonUser.memberships).toEqual([]);
      expect(anonUser.avatar).toBeNull();
      expect(anonUser.anon).toBe(true);
    });

    it('should have hasRole method that returns true for ANON role', () => {
      const successSpy = jest.fn();
      AnonStrategy.success = successSpy;

      AnonStrategy.authenticate.call(AnonStrategy);

      const anonUser = successSpy.mock.calls[0][0] as IAnonUser;

      expect(anonUser.hasRole('any-client', 'ANON')).toBe(true);
      expect(anonUser.hasRole('any-client', 'USER')).toBe(false);
      expect(anonUser.hasRole('any-client', 'ADMIN')).toBe(false);
    });
  });
});