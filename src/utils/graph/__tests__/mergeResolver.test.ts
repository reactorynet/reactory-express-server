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
