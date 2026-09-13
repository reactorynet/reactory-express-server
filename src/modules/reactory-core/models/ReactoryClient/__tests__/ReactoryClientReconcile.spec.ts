import { applyReconcileDefaults } from '../statics';

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
});
