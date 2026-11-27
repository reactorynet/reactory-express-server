/**
 * REACTORY-302016408/20261121/3585990947 — Ticket C
 * Purge workflow archives older than N days (default 180), configurable cutoff.
 *
 * Every test builds a throwaway `<tmp>/workflows/archive` tree and points
 * REACTORY_DATA at `<tmp>`. Month directories are computed relative to the
 * current clock, so the suite does not rot as the calendar moves.
 *
 * See `WorkflowArchiveService.purgeArchives_plan.md` for the per-criterion map.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import WorkflowArchiveService from '../Workflow/WorkflowArchiveService';
import { YamlFlowParser } from '@reactory/server-modules/reactory-core/workflow/YamlFlow';
import { YamlStepRegistry } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/steps/registry/YamlStepRegistry';

// ── Clock-relative fixture helpers ──────────────────────────────────────────

/** `YYYY-MM` for `months` months from now (UTC). */
const monthKey = (months: number): string => {
  const now = new Date();
  const shifted = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** Last millisecond of `YYYY-MM`, UTC — the instant the bucket's data ends. */
const monthEndIso = (key: string): string => {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month, 1) - 1).toISOString();
};

const OLD = monthKey(-18);
const OLDER = monthKey(-12);
const NEW = monthKey(-1);

/**
 * Remove a fixture tree depth-first.
 *
 * `fs.rmSync` post-dates this repository's `@types/node` (10.x), so the tree is
 * unwound rather than recursively removed (same approach as
 * `src/express/i18n/__tests__/support/i18nFixture.ts`).
 */
const removeTree = (root: string): void => {
  fs.readdirSync(root, { withFileTypes: true }).forEach((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      removeTree(entryPath);
    } else {
      fs.unlinkSync(entryPath);
    }
  });
  fs.rmdirSync(root);
};

// ── Service harness ────────────────────────────────────────────────────────

const context = {
  user: { _id: 'test-user' },
  partner: { key: 'REACTORY' },
  hasRole: (role: string) => ['ADMIN', 'SYSTEM'].includes(role),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

let originalReactoryData: string | undefined;
let originalArchiveWindow: string | undefined;
let tmpRoot: string;
let workflowsRoot: string;
let archiveRoot: string;
let catalogRoot: string;
let service: WorkflowArchiveService;

const resetHarness = () => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-purge-'));
  workflowsRoot = path.join(tmpRoot, 'workflows');
  archiveRoot = path.join(workflowsRoot, 'archive');
  catalogRoot = path.join(workflowsRoot, 'catalog');
  fs.mkdirSync(archiveRoot, { recursive: true });
  fs.mkdirSync(catalogRoot, { recursive: true });
  process.env.REACTORY_DATA = tmpRoot;
  delete process.env.REACTORY_WORKFLOW_ARCHIVE_DAYS;
  service = new WorkflowArchiveService({} as any, context as any);
};

/**
 * Create `<archiveRoot>/<relative>` with the given files (name → content) and an
 * optional manifest.json.
 */
const writeBucket = (
  relative: string,
  files: Record<string, string> = { 'instances.json': '{}' },
  manifest?: Record<string, any>,
): string => {
  const dir = path.join(archiveRoot, relative);
  fs.mkdirSync(dir, { recursive: true });
  Object.entries(files).forEach(([name, content]) => {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  });
  if (manifest) {
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  }
  return dir;
};

const readPurgeLog = (): any[] => {
  const logPath = path.join(archiveRoot, 'purge.log.ndjson');
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

beforeAll(() => {
  originalReactoryData = process.env.REACTORY_DATA;
  originalArchiveWindow = process.env.REACTORY_WORKFLOW_ARCHIVE_DAYS;
});

beforeEach(() => {
  resetHarness();
  context.log.mockClear();
});

afterEach(() => {
  removeTree(tmpRoot);
});

afterAll(() => {
  if (originalReactoryData === undefined) delete process.env.REACTORY_DATA;
  else process.env.REACTORY_DATA = originalReactoryData;

  if (originalArchiveWindow === undefined) delete process.env.REACTORY_WORKFLOW_ARCHIVE_DAYS;
  else process.env.REACTORY_WORKFLOW_ARCHIVE_DAYS = originalArchiveWindow;
});

// ── Acceptance 1: dry run ──────────────────────────────────────────────────

describe('dryRun (default)', () => {
  it('lists exactly the buckets that would be removed, with total bytes, and deletes nothing', async () => {
    writeBucket(`core/Def/1.0.0/${OLD}`, { 'instances.json': 'x'.repeat(100) });
    writeBucket(`core/Def/1.0.0/${OLDER}`, { 'instances.json': 'x'.repeat(20) });
    writeBucket(`core/Def/1.0.0/${NEW}`, { 'instances.json': 'x'.repeat(7) });
    writeBucket(`other/Second/2.1.0/${OLD}`, { 'instances.json': 'x'.repeat(3) });
    fs.writeFileSync(path.join(archiveRoot, 'manifest.index.json'), '{}');

    const result = await service.purgeArchives({ olderThanDays: 180 });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.buckets.map((bucket) => bucket.bucket).sort()).toEqual(
      [
        `core/Def/1.0.0/${OLD}`,
        `core/Def/1.0.0/${OLDER}`,
        `other/Second/2.1.0/${OLD}`,
      ].sort(),
    );
    expect(result.buckets.every((bucket) => bucket.status === 'would-delete')).toBe(true);
    expect(result.bytes).toBe(100 + 20 + 3);
    expect(result.oldest).toBe(monthEndIso(OLD));
    expect(result.newest).toBe(monthEndIso(OLDER));
    expect(result.deletedBuckets).toBe(0);

    // Nothing was deleted and nothing was written (no audit log on a dry run).
    expect(fs.existsSync(path.join(archiveRoot, `core/Def/1.0.0/${OLD}`, 'instances.json'))).toBe(true);
    expect(fs.existsSync(path.join(archiveRoot, `core/Def/1.0.0/${NEW}`, 'instances.json'))).toBe(true);
    expect(readPurgeLog()).toEqual([]);
    expect(path.basename(result.purgeLog)).toBe('purge.log.ndjson');
  });

  it('reports an empty candidate set (not an error) when no archive root exists', async () => {
    removeTree(archiveRoot);

    const result = await service.purgeArchives({ olderThanDays: 180, dryRun: false });

    expect(result.success).toBe(true);
    expect(result.buckets).toEqual([]);
    expect(result.message).toMatch(/nothing to purge/i);
    expect(fs.existsSync(archiveRoot)).toBe(false);
  });
});

// ── Acceptance 2 + 3: age comes from the NAME ──────────────────────────────

describe('age is derived from the bucket name, not mtime', () => {
  it('purges an old bucket whose mtime was reset to now (a restored archive)', async () => {
    const bucket = writeBucket(`core/Def/1.0.0/${OLD}`, { 'instances.json': 'x'.repeat(10) });
    const now = new Date();
    fs.utimesSync(bucket, now, now);

    const result = await service.purgeArchives({ olderThanDays: 180, dryRun: false });

    expect(result.deletedBuckets).toBe(1);
    expect(result.buckets[0].ageSource).toBe('name');
    expect(fs.existsSync(bucket)).toBe(false);
  });

  it('never touches a bucket whose name is newer than the cutoff, even with an ancient mtime', async () => {
    const bucket = writeBucket(`core/Def/1.0.0/${NEW}`, { 'instances.json': 'x'.repeat(10) });
    const ancient = new Date('2000-01-01T00:00:00.000Z');
    fs.utimesSync(bucket, ancient, ancient);

    const result = await service.purgeArchives({ olderThanDays: 180, dryRun: false });

    expect(result.buckets).toEqual([]);
    expect(result.deletedBuckets).toBe(0);
    expect(fs.existsSync(path.join(bucket, 'instances.json'))).toBe(true);
  });
});

// ── Acceptance 4: C1 ordering assertion ────────────────────────────────────

describe('C1 — the two clocks', () => {
  it.each([30, 29, 1])(
    'refuses to run when olderThanDays (%i) is not strictly greater than the archive window (30)',
    async (olderThanDays) => {
      const bucket = writeBucket(`core/Def/1.0.0/${OLD}`);

      await expect(service.purgeArchives({ olderThanDays, dryRun: false })).rejects.toThrow(
        /strictly greater than the archive window/,
      );

      expect(fs.existsSync(path.join(bucket, 'instances.json'))).toBe(true);
      expect(readPurgeLog()).toEqual([]);
    },
  );

  it('refuses when the configured archive window (env) is raised above the purge window', async () => {
    process.env.REACTORY_WORKFLOW_ARCHIVE_DAYS = '200';
    writeBucket(`core/Def/1.0.0/${OLD}`);

    await expect(service.purgeArchives({ olderThanDays: 180, dryRun: false })).rejects.toThrow(
      /olderThanDays \(180\) must be strictly greater than the archive window \(200 days\)/,
    );
  });

  it('accepts a window one day greater than the archive window', async () => {
    writeBucket(`core/Def/1.0.0/${OLD}`);

    const result = await service.purgeArchives({ olderThanDays: 31, dryRun: true });

    expect(result.archiveWindowDays).toBe(30);
    expect(result.buckets).toHaveLength(1);
  });
});

// ── Acceptance 5: path-traversal guard ─────────────────────────────────────

describe('path-traversal guard', () => {
  const buildOutsideTree = (): string => {
    const outside = path.join(tmpRoot, 'outside');
    fs.mkdirSync(path.join(outside, `core/Def/1.0.0/${OLD}`), { recursive: true });
    fs.writeFileSync(path.join(outside, `core/Def/1.0.0/${OLD}`, 'instances.json'), 'keep me');
    return outside;
  };

  it('refuses archiveRoot "/" before deleting anything', async () => {
    const bucket = writeBucket(`core/Def/1.0.0/${OLD}`);

    await expect(service.purgeArchives({ olderThanDays: 180, dryRun: false, archiveRoot: '/' })).rejects.toThrow(
      /must be strictly inside/,
    );

    expect(fs.existsSync(path.join(bucket, 'instances.json'))).toBe(true);
  });

  it('refuses archiveRoot "../../" before deleting anything', async () => {
    const outside = buildOutsideTree();

    await expect(
      service.purgeArchives({ olderThanDays: 180, dryRun: false, archiveRoot: '../../' }),
    ).rejects.toThrow(/must be strictly inside/);

    expect(fs.existsSync(path.join(outside, `core/Def/1.0.0/${OLD}`, 'instances.json'))).toBe(true);
  });

  it('refuses an archiveRoot that is a symlink escaping <REACTORY_DATA>/workflows', async () => {
    const outside = buildOutsideTree();
    const link = path.join(workflowsRoot, 'archive-link');
    fs.symlinkSync(outside, link, 'dir');

    await expect(
      service.purgeArchives({ olderThanDays: 180, dryRun: false, archiveRoot: link }),
    ).rejects.toThrow(/must be strictly inside/);

    expect(fs.existsSync(path.join(outside, `core/Def/1.0.0/${OLD}`, 'instances.json'))).toBe(true);
  });

  it('refuses a pointable root inside the workflow catalog', async () => {
    await expect(
      service.purgeArchives({ olderThanDays: 180, dryRun: false, archiveRoot: catalogRoot }),
    ).rejects.toThrow(/inside the workflow catalog/);
  });
});

// ── Acceptance 6 + 7 + C3.4: protected paths and the audit log ─────────────

describe('deleting run', () => {
  it('keeps manifest.index.json, the archive root and the definition directory', async () => {
    writeBucket(`core/Def/1.0.0/${OLD}`, { 'instances.json': 'x'.repeat(5) });
    fs.writeFileSync(path.join(archiveRoot, 'manifest.index.json'), '{"index":true}');

    const result = await service.purgeArchives({ olderThanDays: 180, dryRun: false });

    expect(result.deletedBuckets).toBe(1);
    expect(fs.existsSync(path.join(archiveRoot, 'manifest.index.json'))).toBe(true);
    expect(fs.existsSync(archiveRoot)).toBe(true);
    expect(fs.existsSync(path.join(archiveRoot, 'core/Def/1.0.0'))).toBe(true);
    expect(fs.existsSync(path.join(archiveRoot, `core/Def/1.0.0/${OLD}`))).toBe(false);
  });

  it('records {bucket, instanceCount, bytes, archivedAt} in the purge log before deleting', async () => {
    const archivedAt = '2025-01-05T00:00:00.000Z';
    const bucket = writeBucket(
      `core/Def/1.0.0/${OLD}`,
      { 'instances.json': 'x'.repeat(42) },
      { instanceCount: 7, archivedAt, bytes: 42 },
    );
    // The audit record measures the tree on disk, so it includes manifest.json.
    const expectedBytes = fs
      .readdirSync(bucket)
      .reduce((total, name) => total + fs.statSync(path.join(bucket, name)).size, 0);

    const result = await service.purgeArchives({ olderThanDays: 180, dryRun: false });

    const records = readPurgeLog();
    expect(records.length).toBeGreaterThanOrEqual(2);

    const bucketRecord = records.find((record) => record.type === 'bucket');
    expect(bucketRecord).toMatchObject({
      bucket: `core/Def/1.0.0/${OLD}`,
      instanceCount: 7,
      bytes: expectedBytes,
      archivedAt,
      bucketMonth: OLD,
      ageSource: 'name',
    });
    expect(bucketRecord.deletedAt).toBeDefined();

    // The bucket record is written BEFORE the run summary — the audit trail of a
    // deletion exists even if the process dies mid-run.
    expect(records[0].type).toBe('bucket');
    expect(records[records.length - 1]).toMatchObject({
      type: 'run',
      bucketsDeleted: 1,
      bytesDeleted: expectedBytes,
      olderThanDays: 180,
      archiveWindowDays: 30,
    });

    expect(result.purgeLog).toBe(fs.realpathSync(archiveRoot) + path.sep + 'purge.log.ndjson');
    expect(fs.existsSync(result.purgeLog)).toBe(true);
  });

  it('skips a bucket that holds an archive .lock file', async () => {
    const bucket = writeBucket(`core/Def/1.0.0/${OLD}`);
    fs.writeFileSync(path.join(bucket, '.lock'), 'archive-running');

    const result = await service.purgeArchives({ olderThanDays: 180, dryRun: false });

    expect(result.deletedBuckets).toBe(0);
    expect(result.buckets[0].status).toBe('skipped');
    expect(result.buckets[0].skippedReason).toMatch(/archive run may be writing it/);
    expect(fs.existsSync(path.join(bucket, 'instances.json'))).toBe(true);
  });

  it('refuses to start while another purge holds .purge.lock', async () => {
    const bucket = writeBucket(`core/Def/1.0.0/${OLD}`);
    fs.writeFileSync(path.join(archiveRoot, '.purge.lock'), '{"pid":1}');

    await expect(service.purgeArchives({ olderThanDays: 180, dryRun: false })).rejects.toThrow(
      /another purge run holds/,
    );

    expect(fs.existsSync(path.join(bucket, 'instances.json'))).toBe(true);
  });

  it('leaves mtime-aged legacy directories alone when they are still young, and reports them as mtime-aged when old', async () => {
    const legacyOld = path.join(archiveRoot, 'core/Def/1.0.0/hand-placed');
    fs.mkdirSync(legacyOld, { recursive: true });
    fs.writeFileSync(path.join(legacyOld, 'instance.json'), '{}');
    const ancient = new Date('2000-01-01T00:00:00.000Z');
    fs.utimesSync(legacyOld, ancient, ancient);

    const legacyYoung = path.join(archiveRoot, 'core/Def/1.0.0/recent-hand-placed');
    fs.mkdirSync(legacyYoung, { recursive: true });
    fs.writeFileSync(path.join(legacyYoung, 'instance.json'), '{}');

    const result = await service.purgeArchives({ olderThanDays: 180, dryRun: true });

    expect(result.buckets).toHaveLength(1);
    expect(result.buckets[0].bucket).toBe('core/Def/1.0.0/hand-placed');
    expect(result.buckets[0].ageSource).toBe('mtime');
    expect(result.buckets[0].bucketMonth).toBeNull();
    expect(context.log).toHaveBeenCalledWith(
      expect.stringContaining('does not parse as YYYY-MM'),
      expect.anything(),
      'warn',
      expect.any(String),
    );
  });
});

// ── Acceptance 8: orphaned live logs are opt-in ────────────────────────────

describe('C4 — orphaned live logs', () => {
  const writeOrphanLogs = (): string => {
    const logsDir = path.join(catalogRoot, 'core/CleanCacheWorkflow/1.0.0/logs');
    fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(path.join(logsDir, 'run-1.json'), '{"run":1}');
    const ancient = new Date('2000-01-01T00:00:00.000Z');
    fs.utimesSync(path.join(logsDir, 'run-1.json'), ancient, ancient);
    return logsDir;
  };

  it('leaves orphaned logs untouched on a deleting run by default', async () => {
    const logsDir = writeOrphanLogs();

    const result = await service.purgeArchives({ olderThanDays: 180, dryRun: false });

    expect(result.orphanedLiveLogs.requested).toBe(false);
    expect(result.orphanedLiveLogs.dirs).toEqual([]);
    expect(fs.existsSync(path.join(logsDir, 'run-1.json'))).toBe(true);
  });

  it('reports them on a dry run when purgeOrphanedLiveLogs is enabled', async () => {
    const logsDir = writeOrphanLogs();

    const result = await service.purgeArchives({
      olderThanDays: 180,
      dryRun: true,
      purgeOrphanedLiveLogs: true,
    });

    expect(result.orphanedLiveLogs.requested).toBe(true);
    expect(result.orphanedLiveLogs.dirs).toHaveLength(1);
    expect(result.orphanedLiveLogs.dirs[0]).toMatchObject({
      path: `core/CleanCacheWorkflow/1.0.0/logs`,
      status: 'would-delete',
      files: 1,
    });
    expect(result.orphanedLiveLogs.bytes).toBe(9);
    expect(fs.existsSync(path.join(logsDir, 'run-1.json'))).toBe(true);
  });

  it('deletes them when purgeOrphanedLiveLogs is explicitly enabled', async () => {
    const logsDir = writeOrphanLogs();

    const result = await service.purgeArchives({
      olderThanDays: 180,
      dryRun: false,
      purgeOrphanedLiveLogs: true,
    });

    expect(result.orphanedLiveLogs.deletedDirs).toBe(1);
    expect(fs.existsSync(logsDir)).toBe(false);
    expect(fs.existsSync(path.join(catalogRoot, 'core/CleanCacheWorkflow/1.0.0'))).toBe(true);
    expect(readPurgeLog().some((record) => record.type === 'orphaned-logs')).toBe(true);
  });

  it('never touches logs whose version directory still has a definition', async () => {
    const versionDir = path.join(catalogRoot, 'core/LiveWorkflow/1.0.0');
    const logsDir = path.join(versionDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(path.join(versionDir, 'LiveWorkflow.yaml'), 'name: LiveWorkflow');
    fs.writeFileSync(path.join(logsDir, 'run-1.json'), '{}');
    const ancient = new Date('2000-01-01T00:00:00.000Z');
    fs.utimesSync(path.join(logsDir, 'run-1.json'), ancient, ancient);

    const result = await service.purgeArchives({
      olderThanDays: 180,
      dryRun: false,
      purgeOrphanedLiveLogs: true,
    });

    expect(result.orphanedLiveLogs.dirs).toEqual([]);
    expect(fs.existsSync(path.join(logsDir, 'run-1.json'))).toBe(true);
  });
});

// ── C5: the registered definition ──────────────────────────────────────────

describe('core.PurgeWorkflowArchives definition', () => {
  const yamlPath = path.join(
    process.cwd(),
    'src/modules/reactory-core/workflows/Retention/PurgeWorkflowArchives.workflow.yaml',
  );

  it('parses, registers every step type, and never shells out', () => {
    expect(fs.existsSync(yamlPath)).toBe(true);

    const parser = new YamlFlowParser();
    const parsed = parser.parseFromFile(yamlPath);

    expect(parsed.errors).toEqual([]);
    expect(parsed.success).toBe(true);

    const definition = parsed.workflow;
    expect(definition.nameSpace).toBe('core');
    expect(definition.name).toBe('PurgeWorkflowArchives');
    expect(String(definition.version)).toBe('1.0.0');

    // Defaults are the safe ones: 180-day window, dry run ON.
    expect(definition.inputs.olderThanDays.default).toBe(180);
    expect(definition.inputs.dryRun.default).toBe(true);
    expect(definition.inputs.purgeOrphanedLiveLogs.default).toBe(false);

    const registry = new YamlStepRegistry();
    const types = definition.steps.map((step) => step.type);
    types.forEach((type) => expect(registry.hasStep(type)).toBe(true));
    expect(types).not.toContain('cli_command');

    const purgeStep = definition.steps.find((step) => step.id === 'purge');
    expect(purgeStep.type).toBe('service_invoke');
    expect((purgeStep.config as any).service).toBe('core.WorkflowArchiveService@1.0.0');
    expect((purgeStep.config as any).method).toBe('purgeArchives');
    expect((purgeStep.config as any).params.dryRun).toBe('${input.dryRun}');
  });
});
