import ReactoryI18n from '../ReactoryI18n';
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
 * `/graph`. The i18n middleware sat at 98, and later 0, both of which sort after
 * `ReactoryGraph` at -60, so request language detection never applied to
 * GraphQL. A comment claimed it did while the declared value said otherwise,
 * which is why the order is asserted rather than trusted.
 */
describe('middleware ordering', () => {
  it('declares an ordinal before the GraphQL middleware', () => {
    expect(ReactoryI18n.ordinal).toBeLessThan(ReactoryGraph.ordinal);
  });

  it('sorts ahead of GraphQL with the real ascending comparator', () => {
    const sorted = [ReactoryGraph, ReactoryI18n]
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal);

    expect(sorted.map((middleware) => middleware.name)).toEqual([
      'ReactoryI18n',
      'ReactoryGraphMiddleware',
    ]);
  });
});
