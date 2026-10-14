import { getAllowedCorsHeaders } from '../../cors';
import { LANGUAGE_HEADER } from '../language';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * The client sends the user's language choice with every GraphQL request.
 * A header missing from the CORS allowlist fails the preflight, so the request
 * never leaves the browser and the whole GraphQL API appears broken — which is
 * exactly what happened when the language header was first added.
 *
 * These tests exist so that coupling cannot regress silently.
 */
describe('CORS allowed headers', () => {
  const headers = getAllowedCorsHeaders().map((header) => header.toLowerCase());

  it('allows the request language header the client sends', () => {
    expect(headers).toContain(LANGUAGE_HEADER.toLowerCase());
  });

  it('lists the language header exactly once', () => {
    // Header names are matched case-insensitively, so a second spelling is
    // redundant — and a stale variant is what makes the allowlist look correct
    // while the header the client actually sends is absent.
    const listed = getAllowedCorsHeaders().filter(
      (header) => header.toLowerCase() === LANGUAGE_HEADER.toLowerCase(),
    );

    expect(listed).toHaveLength(1);
  });

  it('allows the browser language header as a fallback', () => {
    expect(headers).toContain('accept-language');
  });

  it('still allows the headers the client already relies on', () => {
    [
      'authorization',
      'x-client-key',
      'x-client-public-key',
      'x-client-name',
      'x-client-version',
      'apollo-require-preflight',
      'content-type',
    ].forEach((header) => {
      expect(headers).toContain(header);
    });
  });

  it('includes the proxy headers used for client IP resolution', () => {
    expect(headers).toContain('x-forwarded-for');
  });

  it('does not leak empty entries from the split source list', () => {
    expect(getAllowedCorsHeaders().every((header) => header.trim().length > 0)).toBe(true);
  });
});
