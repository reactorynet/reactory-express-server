# Workflow archive retention (Ticket C)

Implements REACTORY-302016408/20261121/3585990947 — *Purge workflow archives
older than N days (default 6 months), configurable cutoff*.

| Piece | Where |
|---|---|
| Service | `core.WorkflowArchiveService@1.0.0` — `services/Workflow/WorkflowArchiveService.ts` |
| Helpers / guards | `services/Workflow/archiveRetention.ts` |
| Workflow | `core.PurgeWorkflowArchives@1.0.0` — `workflows/Retention/PurgeWorkflowArchives.workflow.yaml` |
| Tests | `services/__tests__/WorkflowArchiveService.purgeArchives.test.ts` (+ `_plan.md`) |

Filesystem only. Nothing here reads or writes MongoDB.

## What a bucket is

The archive workflow writes:

```
<REACTORY_DATA>/workflows/archive/<namespace>/<name>/<version>/<YYYY-MM>/
    manifest.json
    <instance files>
```

`<YYYY-MM>` is the UTC month the bucket holds. It is written once, by us.

## Two clocks (C1)

| Mechanism | Window | Operates on | Default | Configured by |
|---|---|---|---|---|
| Archive workflow | 30 days | MongoDB → disk | 30 | `REACTORY_WORKFLOW_ARCHIVE_DAYS` |
| Purge workflow | 180 days | disk → deleted | 180 | `olderThanDays` input |

`assertPurgeWindow` refuses a run whose `olderThanDays` is **not strictly
greater** than the archive window. It throws before the archive root is even
resolved, so a typo cannot delete a month of archives:

```
Refusing to purge: olderThanDays (30) must be strictly greater than the archive
window (30 days). The purge deletes what the archive workflow wrote; a window at
or below the archive window would delete archives before the live data they
represent has been reclaimed. Use a larger olderThanDays (default 180) or fix
REACTORY_WORKFLOW_ARCHIVE_DAYS.
```

## Age comes from the bucket NAME (C2)

`mtime` changes on copy, rsync, restore-from-backup and on any tool that touches
the tree, so a restored archive would look brand new and be retained forever.

* A `YYYY-MM` bucket is old when **the whole month it holds** ends before the
  cutoff (`monthEndUtc < cutoff`). Using the month end rather than the month
  start keeps the newest bucket alive for the days it legitimately holds data.
* A directory whose name does not parse as `YYYY-MM` (legacy / hand-placed) falls
  back to `mtime`, and the run logs a `warn` naming the directory so the operator
  knows the age was guessed.
* All arithmetic is UTC. "6 months" is never computed in local time.

## Deletion procedure (C3)

For each bucket older than the cutoff:

1. `manifest.json` is read and `{bucket, instanceCount, bytes, archivedAt, ...}`
   is appended to `archive/purge.log.ndjson` **before** anything is deleted.
2. The bucket is walked (`deleteTreeContents`): files are unlinked, symlinks are
   unlinked (never followed), directories are removed bottom-up.
3. The bucket directory itself is removed last.

Never deleted: the archive root, the bucket's parent definition directory,
`manifest.index.json`, `purge.log.ndjson`, `.purge.lock`.

### Guards

| Guard | Refusal |
|---|---|
| `archiveRoot` outside `<REACTORY_DATA>/workflows` | `PATH_GUARD` — includes `/`, `../../`, and a symlink whose target escapes |
| `archiveRoot` equal to `<REACTORY_DATA>/workflows` | `PATH_GUARD` — a scan there would descend into the catalog |
| `archiveRoot` inside `<REACTORY_DATA>/workflows/catalog` | `PATH_GUARD` — the catalog is live data, not archives |
| bucket shallower than `<ns>/<name>/<ver>/<YYYY-MM>` | `BUCKET_GUARD` |
| bucket is a symlink / not a directory | `BUCKET_GUARD` |
| bucket resolves outside the root through a symlinked ancestor | `BUCKET_GUARD` |
| another purge holds `archive/.purge.lock` | `PURGE_LOCKED` |
| bucket holds `.lock` or `.archive.lock` | skipped (an archive run may be writing it) |

Bucket-level guards are re-checked immediately before deletion — the scan's
answer is never trusted on its own.

## `dryRun`

`dryRun` defaults to **true** and a dry run writes nothing at all: no lock file,
no audit record, no directory. It reports:

```ts
{
  buckets: [{ bucket, bytes, files, bucketMonth, ageSource, effectiveDate,
              ageDays, instanceCount, archivedAt, status: 'would-delete' }],
  bytes, oldest, newest,
  cutoff, olderThanDays, archiveWindowDays, archiveRoot,
  orphanedLiveLogs: { requested, dirs, bytes },
  purgeLog, lock, durationMs, success, message
}
```

`bytes`, `oldest` and `newest` describe the buckets that are (or would be)
removed; a bucket skipped because it is locked is listed with `status:
'skipped'` and a reason, and is excluded from the totals.

## C4 — the orphaned live logs: **opt-in, off by default**

Decision recorded here as the ticket requires.

The tree also holds definition-scoped run logs under
`catalog/<ns>/<name>/<ver>/logs/`. Some belong to definitions that no longer have
a YAML file (`catalog/core/CleanCacheWorkflow/1.0.0/logs/` is the known
example) — nothing will ever archive those through the workflow-driven path, and
they are the largest single pile of reclaimable bytes.

`purgeArchives({ purgeOrphanedLiveLogs: true })` will also delete such a `logs`
directory when **all** of the following hold:

1. it is exactly `<catalog>/<ns>/<name>/<ver>/logs` (depth-checked);
2. its version directory contains **no** `.yaml` / `.yml` file — re-checked
   immediately before deletion, so a definition that reappears in between wins;
3. its **newest** log file is older than the cutoff;
4. it is not a symlink and does not resolve outside the catalog.

It defaults to `false`: a live-but-temporarily-unregistered definition (during a
redeploy, or a definition being edited) would lose its logs. Enabling it is a
deliberate, separate decision — the workflow exposes it as its own input.

## C5 — why the workflow does not shell out

The ticket prefers a service over `cli_command rm -rf`, and that preference is
followed completely: `core.PurgeWorkflowArchives@1.0.0` is a thin driver
(`start → log → set_variable → service_invoke → condition → log → end`). There is
no `cli_command`, no path interpolation and no `-rf` anywhere in the path from
workflow input to deletion. The service's own `deleteTreeContents` is the only
deletion primitive.

## C6 — scheduling

Not scheduled by this ticket. When it is:

* schedule it **less** often than the archive workflow (archive daily, purge
  monthly);
* the run-level `archive/.purge.lock` prevents two purges overlapping, and a
  bucket carrying `.lock` / `.archive.lock` is skipped, so a purge cannot race an
  archive writing the same bucket.

## Risks the operator owns

* **Irreversible.** There is no recycle bin. `dryRun: true` by default, the C1
  assertion and the path guard are load-bearing, not polish.
* **Backups.** If `reactory-data/backups/` includes the archive tree, purging
  locally does not free backup space, and a restore would resurrect purged
  buckets. Confirm retention policy with whoever owns backups before the first
  deleting run.
* **Clock skew.** Bucket names are UTC. Do not reason about "6 months" in local
  time.

## Running it

```bash
# Dry run (safe; the default):
bin/reactory workflow start core.PurgeWorkflowArchives@1.0.0 \
  --input='{"olderThanDays": 180}'

# Only to be run after the dry-run report has been reviewed:
bin/reactory workflow start core.PurgeWorkflowArchives@1.0.0 \
  --input='{"olderThanDays": 180, "dryRun": false}'
```

Audit trail: `<REACTORY_DATA>/workflows/archive/purge.log.ndjson` — one
`type: "bucket"` record per deletion (written before the bytes go), one
`type: "orphaned-logs"` record when that opt-in is used, and one `type: "run"`
summary per deleting run.
