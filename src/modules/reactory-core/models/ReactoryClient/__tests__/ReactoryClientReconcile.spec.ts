import { applyReconcileDefaults, reconcileApplicationRoles } from '../statics';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [
    {
      id: 'reactory-core',
      nameSpace: 'core',
      name: 'ReactoryServer',
      version: '1.0.0',
      priority: 0,
      roles: ['ORGANIZATION_ADMIN', 'SUPPORT_ADMIN'],
    },
    {
      id: 'reactory-payment',
      nameSpace: 'payment',
      name: 'ReactoryPayment',
      version: '1.0.0',
      priority: 15,
      roles: ['FINANCE_MANAGER'],
    },
  ],
}));

const logger = require('@reactory/server-core/logging');

describe('ReactoryClient reconcile semantics (D5)', () => {
  const reconcilableFields = [
    'whitelist',
    'applicationRoles',
    'plugins',
    'featureFlags',
    'auth_config',
    'settings',
    'themes',
    'modules',
    'components',
  ];

  describe('applyReconcileDefaults', () => {
    it('is a no-op when reconcile is disabled (partial-config safety)', () => {
      // Mirrors partial-config callers such as macros that upsert only routes
      // or only menus. Nothing unrelated may be added or cleared.
      const config = { key: 'routes-only' } as any;
      const input: Record<string, any> = { key: 'routes-only' };

      const result = applyReconcileDefaults(config, input, false);

      reconcilableFields.forEach((field) => {
        expect(result[field]).toBeUndefined();
      });
      expect(result).toBe(input);
    });

    it('clears omitted reconcilable collections when reconciling', () => {
      const config = { key: 'full-config' } as any;
      const input: Record<string, any> = { key: 'full-config' };

      const result = applyReconcileDefaults(config, input, true);

      reconcilableFields.forEach((field) => {
        expect(result[field]).toEqual([]);
      });
    });

    it('preserves explicitly provided collections when reconciling', () => {
      const whitelist = ['https://app.reactory.net'];
      const applicationRoles = ['USER', 'ADMIN'];
      const plugins: any[] = [];

      const config = { key: 'full-config', whitelist, applicationRoles, plugins } as any;
      // Real usage: input starts as a shallow copy of the config.
      const input: Record<string, any> = { ...config };

      const result = applyReconcileDefaults(config, input, true);

      // Provided values are untouched (a config-supplied empty array is honoured).
      expect(result.whitelist).toBe(whitelist);
      expect(result.applicationRoles).toBe(applicationRoles);
      expect(result.plugins).toBe(plugins);
      // Omitted ones become authoritative-empty.
      expect(result.settings).toEqual([]);
      expect(result.featureFlags).toEqual([]);
      expect(result.themes).toEqual([]);
    });
  });

  describe('reconcileApplicationRoles', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('keeps and normalises roles the backend provides', () => {
      const result = reconcileApplicationRoles('acme', [
        'USER',
        ' ADMIN ',
        'FINANCE_MANAGER',
        'ORGANIZATION_ADMIN',
      ]);

      expect(result).toEqual(['ADMIN', 'FINANCE_MANAGER', 'ORGANIZATION_ADMIN', 'USER']);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('drops roles that no activated module provides and reports them', () => {
      const result = reconcileApplicationRoles('acme', ['USER', 'CONTENT_MANAGER']);

      expect(result).toEqual(['USER']);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('CONTENT_MANAGER'),
      );
    });

    it('always keeps the platform baseline even when no module declares it', () => {
      const result = reconcileApplicationRoles('acme', ['ANON', 'USER', 'ADMIN', 'DEVELOPER']);

      expect(result).toEqual(['ADMIN', 'ANON', 'DEVELOPER', 'USER']);
    });

    it('returns undefined when the config does not declare roles', () => {
      expect(reconcileApplicationRoles('acme', undefined)).toBeUndefined();
      expect(reconcileApplicationRoles('acme', null)).toBeUndefined();
    });

    it('returns an empty list for an explicitly empty role set', () => {
      expect(reconcileApplicationRoles('acme', [])).toEqual([]);
    });
  });
});
