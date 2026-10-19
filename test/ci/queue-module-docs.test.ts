/**
 * Documentation contract for `docs/06-modules/reactory-queue/`.
 *
 * Ticket: REACTORY-302016408/20261018/1570423695 — "[Docs] Module documentation:
 * reactory-queue". The acceptance criteria for that ticket are reader-facing: a
 * developer must be able to choose and configure a provider from the page alone,
 * and every provider claim must be evidenced in code. Prose alone cannot be
 * regression-tested, so this suite pins the parts that can be:
 *
 *   1. the page exists and carries the machine-readable header;
 *   2. all ten template sections are present, in order, none placeholder;
 *   3. the provider matrix names every backend and every service FQN;
 *   4. the page answers the questions a provider choice depends on
 *      (selection, creation, delivery/ack, retry, tenancy);
 *   5. the migration guide is reachable from the page;
 *   6. every `src/...:line` citation resolves to a real file and line range.
 *
 * Before this change the page did not exist, so the suite failed at (1).
 *
 * Run: `yarn jest test/ci/queue-module-docs.test.ts`
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_DOCS = path.join(ROOT, 'docs', '06-modules');
const OVERVIEW_PATH = path.join(MODULE_DOCS, 'reactory-queue', 'overview.md');
const MIGRATION_PATH = path.join(MODULE_DOCS, 'reactory-queue', 'migration.md');
const INDEX_PATH = path.join(MODULE_DOCS, 'index.md');

const read = (file: string): string =>
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

const overview = read(OVERVIEW_PATH);
const migration = read(MIGRATION_PATH);
const index = read(INDEX_PATH);

/** The ten numbered sections, in template order. */
const SECTIONS = [
  'Purpose and status',
  'Module contract',
  'Data model',
  'GraphQL API',
  'Services',
  'UI surface',
  'Workflows',
  'Operations',
  'Limitations and roadmap',
  'Evidence index',
];

const PROVIDER_KEYS = ['bullmq', 'in-memory', 'aws-sqs'];
const SERVICE_FQNS = [
  'reactory.QueueProvider@1.0.0',
  'reactory.BullMessageQueueService@1.0.0',
  'reactory.InMemoryQueueService@1.0.0',
  'reactory.AWSSQSQueueService@1.0.0',
];

/** Split `## <n>. Title` sections into a number -> body map. */
const sectionsByNumber = (markdown: string): Record<number, string> => {
  const result: Record<number, string> = {};
  const parts = markdown.split(/\n##\s+/).slice(1);
  for (const part of parts) {
    const match = part.match(/^(\d+)\.\s+([^\n]+)\n/);
    if (match) result[Number(match[1])] = part;
  }
  return result;
};

/**
 * The module repositories are separate checkouts. In a worktree the server tree
 * is a sibling of the worktree; in CI the module is installed into
 * `src/modules/reactory-queue`. Resolve the server checkout once, then read
 * citations from whichever root has the file.
 */
const findServerRoot = (): string | null => {
  const candidates: string[] = [];
  if (process.env.REACTORY_SERVER_ROOT) {
    candidates.push(process.env.REACTORY_SERVER_ROOT);
  }
  candidates.push(ROOT);

  let dir = ROOT;
  for (let depth = 0; depth < 4; depth += 1) {
    dir = path.dirname(dir);
    candidates.push(
      path.join(dir, 'reactory-express-server'),
      dir,
    );
  }

  return (
    candidates.find(
      (candidate) =>
        fs.existsSync(path.join(candidate, 'src', 'modules', 'reactory-queue', 'index.ts')) &&
        fs.existsSync(path.join(candidate, 'src', 'services', 'ServiceManager.ts')),
    ) ?? null
  );
};

/**
 * Citations to these paths must always resolve. Citations into other modules are
 * checked when that module is present: `available.json` lists 17 modules but
 * `installed.json` lists the subset this deployment has.
 */
const ALWAYS_PRESENT = [
  'src/modules/reactory-queue/',
  'src/modules/reactory-core/',
  'src/services/',
  'src/application/',
  'src/modules/available.json',
  'src/modules/enabled-reactory.json',
  'src/modules/installed.json',
];

/** Resolve a repository-relative citation to an absolute path. */
const resolveCitation = (relative: string, serverRoot: string | null): string | null => {
  for (const root of [ROOT, serverRoot]) {
    if (!root) continue;
    const candidate = path.join(root, relative);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

describe('reactory-queue module documentation', () => {
  describe('deliverables', () => {
    it('publishes the module page under docs/06-modules/reactory-queue', () => {
      expect(fs.existsSync(OVERVIEW_PATH)).toBe(true);
    });

    it('publishes a migration page next to it', () => {
      expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
    });

    it('lists the module in the module documentation index', () => {
      expect(index).toContain('reactory-queue');
      expect(index).toContain('reactory.Queue@1.0.0');
    });
  });

  describe('machine-readable header', () => {
    const frontMatter = overview.match(/^---\n([\s\S]*?)\n---\n/);

    it('declares front matter', () => {
      expect(frontMatter).not.toBeNull();
    });

    it('declares the required fields', () => {
      const body = frontMatter?.[1] ?? '';
      for (const field of [
        'title',
        'status',
        'owner',
        'verified',
        'verifiedAgainst',
        'audience',
      ]) {
        expect(body).toMatch(new RegExp(`^${field}:\\s*\\S`, 'm'));
      }
    });

    it('uses a permitted status value', () => {
      const status = frontMatter?.[1].match(/^status:\s*(\w+)/m)?.[1];
      expect(['Implemented', 'Partial', 'WIP', 'Roadmap', 'Deprecated']).toContain(
        status,
      );
    });

    it('records an ISO verification date and a code baseline', () => {
      const body = frontMatter?.[1] ?? '';
      expect(body).toMatch(/^verified:\s*\d{4}-\d{2}-\d{2}$/m);
      expect(body).toMatch(/^verifiedAgainst:\s*\S+/m);
    });
  });

  describe('template', () => {
    const sections = sectionsByNumber(overview);

    it('has all ten numbered sections', () => {
      expect(Object.keys(sections).map(Number).sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
    });

    it.each(SECTIONS.map((title, i) => [i + 1, title] as const))(
      'section %i is "%s"',
      (number, title) => {
        expect(sections[number]).toBeDefined();
        const heading = sections[number].split('\n')[0].replace(/^\d+\.\s+/, '').trim();
        expect(heading).toBe(title);
      },
    );

    it('contains no placeholder sections', () => {
      const placeholders = /\b(TBD|TODO|FIXME|coming soon|to be written)\b/i;
      for (const [number, body] of Object.entries(sections)) {
        expect({ section: number, placeholder: body.match(placeholders)?.[0] })
          .toEqual({ section: number, placeholder: undefined });
      }
    });

    it('evidences every section from 1 to 9', () => {
      // A citation is any backticked token ending in `:<line>` or `:<from>-<to>`.
      const citation = /`[^`\s]+:\d+(?:-\d+)?`/;
      for (let number = 1; number <= 9; number += 1) {
        expect({
          section: number,
          cited: citation.test(sections[number] ?? ''),
        }).toEqual({ section: number, cited: true });
      }
    });
  });

  describe('provider selection surface', () => {
    it('names the module FQN', () => {
      expect(overview).toContain('reactory.Queue@1.0.0');
    });

    it.each(PROVIDER_KEYS)('documents the %s provider', (key) => {
      expect(overview).toContain(`\`${key}\``);
    });

    it.each(SERVICE_FQNS)('documents %s', (fqn) => {
      expect(overview).toContain(fqn);
    });

    it('states the outcome of the three extension points the ticket assumed', () => {
      expect(overview).toMatch(/There is none\.\*\* `graph\/index\.ts:1`/);
      expect(overview).toMatch(/The module contributes no workflow surface/);
      expect(overview).toMatch(/There is none\.\*\* The module contributes/);
    });

    it('documents provider selection without relying on the shadowed env var', () => {
      expect(overview).toContain('REACTORY_QUEUE_PROVIDER');
      expect(overview).toMatch(/shadowed/i);
      expect(overview).toContain('REACTORY_QUEUE_BULLMQ_ENABLED');
      expect(overview).toContain('REACTORY_QUEUE_AWS_SQS_ENABLED');
      expect(overview).toContain('setDefaultProvider');
    });

    it('documents the provider differences a caller must code against', () => {
      expect(overview).toContain('createIfNotExists');
      expect(overview).toMatch(/peek/i);
      expect(overview).toMatch(/receipt handle/i);
      expect(overview).toMatch(/at-least-once/i);
      expect(overview).toMatch(/dead-letter/i);
    });

    it('documents tenant scoping and its absence', () => {
      expect(overview).toMatch(/no tenant dimension/i);
      expect(overview).toMatch(/tenant-qualified queue ids/i);
    });

    it('documents the in-memory constraints', () => {
      expect(overview).toMatch(/Lost on restart/i);
      expect(overview).toMatch(/per-instance/i);
    });
  });

  describe('migration path', () => {
    it('is linked from the overview', () => {
      expect(overview).toContain('./migration.md');
    });

    it('covers the registry instead of direct construction', () => {
      expect(migration).toContain('reactory.QueueProvider@1.0.0');
      expect(migration).toContain('getProvider');
      expect(migration).toMatch(/new BullMessageQueueService/);
    });

    it('links the contributor guide rather than copying it', () => {
      expect(migration).toContain('MIGRATION_GUIDE.md');
    });
  });

  describe('banned claims', () => {
    it.each([
      /\b\d+\+\s+modules\b/i,
      /\b\d+\+\s+strategies\b/i,
      /\b\d+x\s+faster\b/i,
      /\b99\.9%/,
      /\bunlimited scalability\b/i,
      /\binfinite scalability\b/i,
    ])('does not contain %s', (pattern) => {
      expect(overview).not.toMatch(pattern);
    });
  });

  describe('evidence citations resolve', () => {
    const serverRoot = findServerRoot();
    const resolveTest = serverRoot ? it : it.skip;

    resolveTest('every `src/...:line` citation points at an existing line', () => {
      const citations = Array.from(
        overview.matchAll(/`(src\/[^`\s]+?):(\d+)(?:-(\d+))?`/g),
      );

      expect(citations.length).toBeGreaterThan(30);

      const failures: string[] = [];
      const unchecked: string[] = [];

      for (const [raw, relative, fromRaw, toRaw] of citations) {
        const resolved = resolveCitation(relative, serverRoot);
        if (!resolved) {
          if (ALWAYS_PRESENT.some((prefix) => relative.startsWith(prefix))) {
            failures.push(`${raw} -> file not found`);
          } else {
            unchecked.push(raw);
          }
          continue;
        }

        const lines = fs.readFileSync(resolved, 'utf8').split('\n').length;
        const from = Number(fromRaw);
        const to = toRaw ? Number(toRaw) : from;

        if (from < 1 || to > lines || from > to) {
          failures.push(`${raw} -> line ${to} outside 1..${lines}`);
        }
      }

      // Surface citations into modules this checkout does not have, so a reader
      // of the test output knows what was not verified here.
      if (unchecked.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `queue docs: ${unchecked.length} citation(s) not verifiable in this checkout ` +
            `(module not installed): ${unchecked.join(', ')}`,
        );
      }

      expect(failures).toEqual([]);
    });
  });
});
