import type { JestConfigWithTsJest } from 'ts-jest';
import baseConfig from './jest.config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const integrationSuites = require('./test/integrationSuites');

/**
 * Integration Jest configuration: the base config restricted to the suites that
 * need live infrastructure (test/integrationSuites.js).
 *
 * The base config is the unit pass and ignores these; this config is its
 * complement, so the two never overlap and neither runs the other's suites.
 *
 * Run with `yarn test:integration`. The suites read their connection details
 * from the environment (MONGOOSE, REACTORY_POSTGRES_*, API_URI_ROOT, ...), so a
 * local run needs those loaded first - `bin/jest.sh` does that from `.env`, and
 * the CI integration job supplies them as job env. See test/README.md.
 */
export default async (): Promise<JestConfigWithTsJest> => {
  const config = await baseConfig();
  const unitIgnores = config.testPathIgnorePatterns || [];
  const integrationIgnores = integrationSuites.integrationIgnorePatterns();

  return {
    ...config,
    displayName: 'reactory-server-integration',
    // Select exactly the integration suites ...
    testMatch: integrationSuites.integrationTestMatch(),
    // ... and stop ignoring them: the base config excludes them because it is
    // the unit pass, which is the opposite of what we want here.
    testPathIgnorePatterns: unitIgnores.filter((p) => !integrationIgnores.includes(p)),
    // These suites boot servers and open sockets; open-handle tracking would
    // report their own long-lived resources as leaks.
    detectOpenHandles: false,
    coverageThreshold: undefined,
  };
};
