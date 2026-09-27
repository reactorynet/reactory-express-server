import { roles } from '@reactory/server-core/authentication/decorators';
import { query, mutation, property, resolver } from '@reactory/server-core/models/graphql/decorators/resolver';
import { InsufficientPermissions } from '@reactory/server-core/exceptions';
import MergeGraphResolvers from '@reactory/server-core/utils/graph/mergeResolver';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * `@roles` on GraphQL resolvers.
 *
 * The resolver map used to hold the undecorated method, so `@roles` on a
 * resolver never ran: an anonymous request could call ADMIN-only queries.
 * Every call below goes through the merged resolver map, as graphql-tools does.
 */
const contextWith = (userRoles: string[], user: any = { _id: 'user_1' }): any => ({
  user,
  hasRole: (role: string) => userRoles.includes(role),
});

const anonymous = () => contextWith(['ANON'], { _id: undefined, anon: true });

// @ts-ignore - resolver() is a marker decorator
@resolver
class GuardedResolver {
  resolver: any;

  private secret() {
    return 'secret';
  }

  @roles(['ADMIN'], 'args.context')
  @query('RolesAbove')
  rolesAbove() {
    return this.secret();
  }

  @query('RolesBelow')
  @roles(['ADMIN'], 'args.context')
  rolesBelow() {
    return this.secret();
  }

  // The default key, as 47 resolvers use it.
  @roles(['ADMIN'])
  @mutation('DefaultKey')
  defaultKey() {
    return this.secret();
  }

  @roles(['ADMIN'], 'args.context')
  @property('Thing', 'hidden')
  hidden() {
    return this.secret();
  }

  @roles(['USER', 'ANON'], 'args.context')
  @query('Open')
  open() {
    return 'open';
  }
}

describe('@roles on resolver classes', () => {
  const merged: any = MergeGraphResolvers([GuardedResolver]);
  const entries: Array<[string, (...args: any[]) => any]> = [
    ['@roles above @query', merged.Query.RolesAbove],
    ['@roles below @query', merged.Query.RolesBelow],
    ['@roles with the default this.context key', merged.Mutation.DefaultKey],
    ['@roles on a field resolver', merged.Thing.hidden],
  ];

  it.each(entries)('%s denies a user without the role', (_label, entry) => {
    expect(() => entry(null, {}, contextWith(['USER']))).toThrow(InsufficientPermissions);
  });

  it.each(entries)('%s admits a user with the role', (_label, entry) => {
    expect(entry(null, {}, contextWith(['ADMIN']))).toBe('secret');
  });

  it('denies an anonymous caller without failing on the missing user id', () => {
    expect(() => merged.Query.RolesAbove(null, {}, anonymous())).toThrow(/anonymous/);
  });

  it('still admits anonymous callers where ANON is allowed', () => {
    expect(merged.Query.Open(null, {}, anonymous())).toBe('open');
  });

  it('enforces roles on the unmerged prototype map too', () => {
    const map = Object.create(GuardedResolver.prototype).resolver;
    expect(() => map.Query.RolesAbove(null, {}, contextWith(['USER']))).toThrow(InsufficientPermissions);
  });

  it('keeps this.context for services', () => {
    class Service {
      context: any;
      constructor(context: any) {
        this.context = context;
      }

      @roles(['ADMIN'])
      run() {
        return 'ran';
      }
    }
    expect(new Service(contextWith(['ADMIN'])).run()).toBe('ran');
    expect(() => new Service(contextWith(['USER'])).run()).toThrow(InsufficientPermissions);
  });
});

describe('ReactoryClients', () => {
  it('is refused to an anonymous caller', async () => {
    const { ReactoryClientResolver } = require('@reactory/server-modules/reactory-core/resolvers/System/ReactoryClientResolver');
    const systemService = { getReactoryClients: jest.fn().mockResolvedValue([]) };
    const context = { ...anonymous(), getService: jest.fn().mockReturnValue(systemService) };

    const { ReactoryClients } = (MergeGraphResolvers([ReactoryClientResolver]) as any).Query;

    expect(() => ReactoryClients(null, {}, context)).toThrow(InsufficientPermissions);
    expect(systemService.getReactoryClients).not.toHaveBeenCalled();
  });
});
