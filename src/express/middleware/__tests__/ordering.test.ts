import ReactoryContext from '../ReactoryContext';
import ReactoryGraph from '../ReactoryGraph';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * Middleware is sorted **ascending** by ordinal, and the GraphQL middleware
 * never calls `next()` — so anything registered after it is unreachable for
 * `/graph`.
 *
 * `ReactoryContext` resolves the request language, so it has to sort before
 * `ReactoryGraph` for that resolution to apply. This asserts the ordering only,
 * not the resolution — but the ordering is what broke before: the detector once
 * lived in a `ReactoryI18n` middleware declaring ordinal 98 (later 0), both
 * after `ReactoryGraph` at -60, while a comment claimed otherwise. The order is
 * therefore asserted rather than trusted.
 *
 * (`ReactoryI18n` has since been removed: its detection was dead, nothing read
 * `req.i18n`/`req.t`/`req.lng`, and it duplicated this path.)
 */
describe('middleware ordering', () => {
  it('resolves the request context before the GraphQL middleware', () => {
    expect(ReactoryContext.ordinal).toBeLessThan(ReactoryGraph.ordinal);
  });

  it('sorts ahead of GraphQL with the real ascending comparator', () => {
    const sorted = [ReactoryGraph, ReactoryContext]
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal);

    expect(sorted.map((middleware) => middleware.name)).toEqual([
      'ReactoryContextMiddleWare',
      'ReactoryGraphMiddleware',
    ]);
  });
});
