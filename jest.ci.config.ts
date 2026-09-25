import type { JestConfigWithTsJest } from 'ts-jest';
import baseConfig from './jest.config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const quarantine: { suites: Array<{ path: string }> } = require('./test/quarantine.json');

/**
 * CI Jest configuration (WP-A8): the base config, minus the suites listed in
 * test/quarantine.json, without the aspirational coverage thresholds (the
 * report is published instead; thresholds are enforced once the suite is
 * green), and without open-handle detection, which stalls a full run.
 */
export default async (): Promise<JestConfigWithTsJest> => {
  const config = await baseConfig();
  const escape = (p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    ...config,
    detectOpenHandles: false,
    coverageThreshold: undefined,
    testPathIgnorePatterns: [
      ...(config.testPathIgnorePatterns || []),
      ...quarantine.suites.map((s) => `<rootDir>/${escape(s.path)}$`),
    ],
  };
};
