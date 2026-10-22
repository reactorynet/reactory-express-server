import fs from 'fs';
import path from 'path';
import { GraphQLScalarType } from 'graphql';
import { query, mutation, property, resolver } from '@reactory/server-core/models/graphql/decorators/resolver';
import MergeGraphResolvers from '../mergeResolver';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const Scalar = new GraphQLScalarType({ name: 'TestScalar', serialize: (v) => v });

// @ts-ignore - resolver() is a marker decorator
@resolver
class HelperResolver {
  resolver: any;

  private greeting(name: string): string {
    return `hello ${name}`;
  }

  @query('Greet')
  greet(_: any, args: { name: string }) {
    return this.greeting(args.name);
  }

  @mutation('Shout')
  shout(_: any, args: { name: string }) {
    return this.greeting(args.name).toUpperCase();
  }

  @property('Person', 'label')
  label(parent: { name: string }) {
    return this.greeting(parent.name);
  }
}

/**
 * A second class contributing to the SAME GraphQL type. Real case:
 * `OrganizationResolver` owns eight `Organization` property resolvers and the
 * demographics resolver adds `demographicsPolicy`.
 */
// @ts-ignore - resolver() is a marker decorator
@resolver
class SecondPersonResolver {
  resolver: any;

  @property('Person', 'email')
  email(parent: { name: string }) {
    return `${parent.name}@example.com`;
  }

  @property('Person', 'label')
  label() {
    return 'overridden';
  }
}

describe('MergeGraphResolvers', () => {
  it('binds class resolver methods so `this` reaches the class helpers', () => {
    const merged: any = MergeGraphResolvers([HelperResolver]);
    // Called detached, as graphql-tools calls them.
    const { Greet } = merged.Query;
    const { Shout } = merged.Mutation;
    const { label } = merged.Person;

    expect(Greet(null, { name: 'ada' })).toBe('hello ada');
    expect(Shout(null, { name: 'ada' })).toBe('HELLO ADA');
    expect(label({ name: 'ada' })).toBe('hello ada');
  });

  it('does not strip the shared prototype map, so a second merge still sees every field', () => {
    MergeGraphResolvers([HelperResolver]);
    const merged: any = MergeGraphResolvers([HelperResolver]);
    expect(Object.keys(merged.Query)).toContain('Greet');
    expect(Object.keys(merged.Mutation)).toContain('Shout');
  });

  /**
   * Regression: the merge spread `$resolver` over `rootResolver`, replacing
   * every non-root type map. A second class registering one field on an
   * existing type therefore dropped every field the first class contributed.
   * The SDL still declared the lost fields, so the failure surfaced at runtime
   * as a null for a non-nullable field rather than as a startup error.
   */
  it('merges field maps contributed by separate classes for the same type', () => {
    const merged: any = MergeGraphResolvers([HelperResolver, SecondPersonResolver]);
    const person = merged.Person;

    expect(Object.keys(person).sort()).toEqual(['email', 'label']);
    // Later class wins on a duplicate field; earlier fields remain reachable.
    expect(person.label({ name: 'ada' })).toBe('overridden');
    expect(person.email({ name: 'ada' })).toBe('ada@example.com');
  });

  it('keeps every field when three classes contribute to one type', () => {
    const third = {
      Person: { phone: () => '000' },
    };
    const merged: any = MergeGraphResolvers([HelperResolver, SecondPersonResolver, third]);

    expect(Object.keys(merged.Person).sort()).toEqual(['email', 'label', 'phone']);
  });

  it('does not mutate a plain-object resolver map passed by the caller', () => {
    const plain = { Query: { Open: () => 'ok' }, Thing: { id: () => '1' } };
    const merged: any = MergeGraphResolvers([plain]);

    expect(merged.Query.Open()).toBe('ok');
    expect(merged.Thing.id()).toBe('1');
    // The previous implementation deleted Query/Mutation/Subscription off the
    // input map, so a second merge of the same object lost every query.
    expect(plain.Query).toBeDefined();
    expect(Object.keys(MergeGraphResolvers([plain]).Query)).toContain('Open');
  });

  it('passes non-plain values such as scalars through untouched', () => {
    const merged: any = MergeGraphResolvers([HelperResolver, { TestScalar: Scalar }]);
    expect(merged.TestScalar).toBe(Scalar);
  });

  // The reactor module is its own repository; a server-only checkout lacks it.
  const reactorPresent = fs.existsSync(path.resolve(__dirname, '../../../modules/reactory-reactor/index.ts'));

  (reactorPresent ? it : it.skip)('serves the AI usage summary, which calls this.scopeFilter()', async () => {
    const UsageResolver = require('@reactory/server-modules/reactory-reactor/graphql/resolvers/ReactorAIUsage').default;
    const analytics = { getUsageSummary: jest.fn().mockResolvedValue({ totalTokens: 7 }) };
    const context: any = {
      user: { _id: 'u1' },
      hasRole: jest.fn().mockReturnValue(true),
      getService: jest.fn().mockReturnValue(analytics),
    };

    const { ReactorAIUsageSummary } = (MergeGraphResolvers([UsageResolver]) as any).Query;
    const result = await ReactorAIUsageSummary(null, { filter: { provider: 'all' } }, context);

    expect(result).toEqual({ totalTokens: 7 });
    // The `all` sentinel was dropped by scopeFilter, proving it ran.
    expect(analytics.getUsageSummary).toHaveBeenCalledWith({});
  });
});
