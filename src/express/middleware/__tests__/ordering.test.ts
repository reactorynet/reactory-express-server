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
 * Request language is resolved in `ReactoryContext`, so that middleware has to
 * sort before `ReactoryGraph` or the resolution never applies to GraphQL. This
 * is not hypothetical: the language detector used to live in a `ReactoryI18n`
 * middleware that declared ordinal 98 (and later 0), both of which sort after
 * `ReactoryGraph` at -60, while a comment claimed the opposite. The order is
 * asserted rather than trusted.
 *
 * (`ReactoryI18n` has since been removed — its own detection was dead, nothing
 * read `req.i18n`/`req.t`/`req.lng`, and it duplicated this path.)
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
