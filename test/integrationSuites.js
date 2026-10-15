/**
 * Suites that need infrastructure the unit pass does not have.
 *
 * These are categorised, not quarantined. Quarantine says "this suite is broken
 * and is excluded until someone fixes it"; this list says "this suite is working
 * as designed and is excluded because of what it requires". Each entry below
 * boots the full server, opens a listening port, or reads and writes a live
 * database, so it cannot pass in a unit run by construction - mocking away the
 * infrastructure would leave nothing worth asserting.
 *
 * `jest.config.ts` (the unit pass, and therefore `yarn test` and `yarn test:ci`)
 * ignores every suite listed here. `jest.integration.config.ts` runs exactly
 * these, via `yarn test:integration`. See test/README.md.
 *
 * Add a suite here when it needs a live external dependency; fix it instead when
 * it only appears to.
 */
const INTEGRATION_SUITES = [
  {
    path: 'src/authentication/strategies/google/GoogleStrategy.spec.ts',
    needs: 'a live MongoDB and a free TCP port for the full ReactoryServer to listen on (:4000)',
  },
  {
    path: 'src/modules/reactory-classroom/tests/unit/seed_apex.test.ts',
    needs: 'a live MongoDB and Postgres with the classroom migrations applied; it seeds data rather than asserting behaviour',
  },
];

const escapeForRegex = (pattern) => pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `testPathIgnorePatterns` entries (regex) that exclude every integration suite.
 * Used by the unit config.
 */
const integrationIgnorePatterns = () =>
  INTEGRATION_SUITES.map(({ path }) => `<rootDir>/${escapeForRegex(path)}$`);

/**
 * `testMatch` entries (literal glob paths) that select every integration suite.
 * Used by the integration config.
 */
const integrationTestMatch = () => INTEGRATION_SUITES.map(({ path }) => `<rootDir>/${path}`);

module.exports = { INTEGRATION_SUITES, integrationIgnorePatterns, integrationTestMatch };
