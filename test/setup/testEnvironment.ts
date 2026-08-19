import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Test environment setup, applied to every suite via test/setup/init.ts
 * (`setupFilesAfterEach` in jest.config.ts).
 *
 * This lived at `src/reactory/dsl/tests/setup/testEnvironment.ts` and was
 * described as DSL-specific, but nothing about it is: it points APP_DATA_ROOT at
 * the fixture tree, creates the directories services expect to exist, and sets
 * the environment variables the server reads at import time. Every suite in the
 * repository depends on it, so it moved here when the experimental DSL component
 * was removed. `APP_DATA_ROOT` still resolves to `src/reactory/test-data`, the
 * same directory as before.
 */
const setupTestEnvironment = () => {
  const testDataRoot = join(__dirname, '../../src/reactory/test-data');

  if (!process.env.APP_DATA_ROOT) {
    process.env.APP_DATA_ROOT = testDataRoot;
  }

  // Create necessary directories if they don't exist
  const requiredDirs = [
    testDataRoot,
    join(testDataRoot, 'logging'),
    join(testDataRoot, 'templates'),
    join(testDataRoot, 'organization'),
    join(testDataRoot, 'profiles'),
    join(testDataRoot, 'fonts'),
    join(testDataRoot, 'i18n'),
    join(testDataRoot, 'workflows'),
    join(testDataRoot, 'builds'),
    join(testDataRoot, 'pdf'),
    join(testDataRoot, 'themes'),
  ];

  requiredDirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  // Set other required environment variables
  process.env.NODE_ENV = 'test';
  // Modules that sign or verify JWTs capture SECRET_SAUCE at import time, so it
  // has to exist before any suite requires them. Without it jwt-simple throws
  // "Require key" from inside otherwise-unrelated tests.
  if (!process.env.SECRET_SAUCE) {
    process.env.SECRET_SAUCE = 'unit-test-secret-sauce-value-32chars!';
  }
  process.env.REACTORY_IS_BUILDING = 'false';
  process.env.CDN_ROOT = 'http://localhost:3000/cdn';
  process.env.WEBROOT = 'http://localhost:3000';

  // Mock console methods to avoid noise in tests. Note for anyone debugging: a
  // console.log from a test is swallowed because of this — write to a file, or
  // temporarily comment these out.
  const originalConsole = { ...console };
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();

  // Return cleanup function
  return () => {
    // Restore original console methods
    Object.assign(console, originalConsole);
  };
};

export default setupTestEnvironment;
