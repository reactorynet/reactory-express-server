import { mkdirSync, mkdtempSync, readdirSync, rmdirSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Throwaway i18n bundle roots for tests that must not read the machine's data
 * root.
 *
 * `language.ts` resolves its bundle root from `APP_DATA_ROOT` and memoises the
 * directory scan, so a suite that asserts on locale folders is only meaningful
 * when it controls that tree: a developer machine has the real `reactory-data`
 * folders, while CI (server-only checkout) has an empty, gitignored
 * `src/reactory/test-data/i18n`. Pinning the behaviour against a fixture makes
 * both environments assert the same thing.
 */

/** Creates `<temp>/i18n/<folder>` for each folder and returns the temp root. */
export const createI18nFixture = (folders: string[], prefix = 'reactory-i18n-'): string => {
  const root = mkdtempSync(join(tmpdir(), prefix));
  folders.forEach((folder) => {
    mkdirSync(join(root, 'i18n', folder), { recursive: true });
  });
  return root;
};

/**
 * Removes a fixture tree.
 *
 * `fs.rmSync` post-dates this repository's `@types/node` (10.x), so the tree is
 * unwound depth-first rather than recursively — the alternative is a new entry
 * in the typecheck baseline for a test helper.
 */
export const removeI18nFixture = (root: string): void => {
  readdirSync(root, { withFileTypes: true }).forEach((entry) => {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      removeI18nFixture(entryPath);
    } else {
      unlinkSync(entryPath);
    }
  });
  rmdirSync(root);
};
