import Reactory from '@reactorynet/reactory-core';
import {
  buildRoleCatalogue,
  findUnknownRoles,
  normaliseRoles,
  REACTORY_PLATFORM_ROLES,
  REACTORY_SYSTEM_ROLES,
} from '../index';

const moduleDef = (
  overrides: Partial<Reactory.Server.IReactoryModule> = {},
): Reactory.Server.IReactoryModule =>
  ({
    id: 'test-module',
    nameSpace: 'test',
    name: 'TestModule',
    version: '1.0.0',
    priority: 10,
    ...overrides,
  } as Reactory.Server.IReactoryModule);

describe('buildRoleCatalogue', () => {
  it('always includes the platform and system roles, even with no modules', () => {
    const catalogue = buildRoleCatalogue([]);

    expect(catalogue.platformRoles.sort()).toEqual([...REACTORY_PLATFORM_ROLES].sort());
    expect(catalogue.systemRoles.sort()).toEqual([...REACTORY_SYSTEM_ROLES].sort());
    expect(catalogue.roles).toEqual(
      expect.arrayContaining([...REACTORY_PLATFORM_ROLES, ...REACTORY_SYSTEM_ROLES]),
    );
    expect(catalogue.modules).toEqual([]);
  });

  it('tolerates a null or undefined module collection', () => {
    expect(buildRoleCatalogue(null).roles).toEqual(
      expect.arrayContaining(REACTORY_PLATFORM_ROLES),
    );
    expect(buildRoleCatalogue(undefined).modules).toEqual([]);
  });

  it('groups distinctive module roles and excludes the platform baseline', () => {
    const catalogue = buildRoleCatalogue([
      moduleDef({
        id: 'reactory-product',
        nameSpace: 'product',
        name: 'ReactoryProduct',
        priority: 5,
        roles: ['ADMIN', 'PRODUCT_MANAGER', 'SYSTEM', 'USER'],
      }),
    ]);

    expect(catalogue.modules).toHaveLength(1);
    expect(catalogue.modules[0]).toMatchObject({
      id: 'reactory-product',
      nameSpace: 'product',
      name: 'ReactoryProduct',
      roles: ['PRODUCT_MANAGER'],
      isCore: false,
    });
    expect(catalogue.roles).toEqual(
      expect.arrayContaining(['PRODUCT_MANAGER', 'ADMIN', 'USER']),
    );
  });

  it('omits modules that only declare platform or system roles', () => {
    const catalogue = buildRoleCatalogue([
      moduleDef({ id: 'only-platform', roles: ['USER', 'ADMIN', 'ANON', 'DEVELOPER', 'SYSTEM'] }),
      moduleDef({ id: 'no-roles' }),
    ]);

    expect(catalogue.modules).toEqual([]);
  });

  it('lists the core module first, then by priority and name', () => {
    const catalogue = buildRoleCatalogue([
      moduleDef({ id: 'late', nameSpace: 'z', name: 'Late', priority: 50, roles: ['LATE_ROLE'] }),
      moduleDef({
        id: 'reactory-core',
        nameSpace: 'core',
        name: 'ReactoryServer',
        priority: 0,
        roles: ['CORE_ROLE'],
      }),
      moduleDef({ id: 'early', nameSpace: 'a', name: 'Early', priority: 1, roles: ['EARLY_ROLE'] }),
    ]);

    expect(catalogue.modules.map((group) => group.id)).toEqual(['reactory-core', 'early', 'late']);
    expect(catalogue.modules[0].isCore).toBe(true);
  });

  it('dedupes, trims and sorts roles per module', () => {
    const catalogue = buildRoleCatalogue([
      moduleDef({ roles: ['  ZETA ', 'ALPHA', 'ALPHA', '', 'BETA'] }),
    ]);

    expect(catalogue.modules[0].roles).toEqual(['ALPHA', 'BETA', 'ZETA']);
  });

  it('derives a stable group id when the module has no id', () => {
    const catalogue = buildRoleCatalogue([
      moduleDef({
        id: undefined,
        nameSpace: 'acme',
        name: 'Widgets',
        version: '2.1.0',
        roles: ['WIDGET_ADMIN'],
      }),
    ]);

    expect(catalogue.modules[0].id).toBe('acme.Widgets@2.1.0');
  });

  it('produces a distinct, sorted flat role list', () => {
    const catalogue = buildRoleCatalogue([
      moduleDef({ id: 'a', roles: ['SHARED', 'A_ONLY'] }),
      moduleDef({ id: 'b', roles: ['SHARED', 'B_ONLY'] }),
    ]);

    const duplicates = catalogue.roles.filter(
      (role, index) => catalogue.roles.indexOf(role) !== index,
    );
    expect(duplicates).toEqual([]);
    expect(catalogue.roles).toEqual([...catalogue.roles].sort((a, b) => a.localeCompare(b)));
  });
});

describe('findUnknownRoles', () => {
  const catalogue = buildRoleCatalogue([
    moduleDef({ id: 'reactory-product', roles: ['PRODUCT_MANAGER'] }),
  ]);

  it('returns roles that no module provides', () => {
    expect(findUnknownRoles(['USER', 'PRODUCT_MANAGER', 'GHOST_ROLE'], catalogue)).toEqual([
      'GHOST_ROLE',
    ]);
  });

  it('returns an empty array when every role is provided', () => {
    expect(findUnknownRoles(['ANON', 'USER', 'ADMIN', 'PRODUCT_MANAGER'], catalogue)).toEqual([]);
  });

  it('ignores duplicates and blanks when reporting unknowns', () => {
    expect(findUnknownRoles(['GHOST_ROLE', 'GHOST_ROLE', '  '], catalogue)).toEqual([
      'GHOST_ROLE',
    ]);
  });
});

describe('normaliseRoles', () => {
  it('trims, dedupes and sorts', () => {
    expect(normaliseRoles([' B ', 'A', 'A', '', '   '])).toEqual(['A', 'B']);
  });

  it('handles nullish input', () => {
    expect(normaliseRoles(null)).toEqual([]);
    expect(normaliseRoles(undefined)).toEqual([]);
  });
});
