# TDD plan — `core.WorkflowArchiveService.purgeArchives` (Ticket C)

Ticket: REACTORY-302016408/20261121/3585990947 — *Purge workflow archives older
than N days (default 6 months), configurable cutoff*.

The feature does not exist before this change, so the suite is new. It is written
against the acceptance list in
`TICKET-C-purge-archives.md` section "Acceptance criteria" — one test per
criterion, plus the destructive-path guards that the ticket calls
"load-bearing".

Fixture: every test builds a throwaway `<tmp>/workflows/archive` tree and points
`REACTORY_DATA` at `<tmp>`. Bucket month directories are computed relative to the
current clock (`now - 12 months`, `now - 1 month`) so the suite cannot rot as the
calendar moves.

| # | Test | Acceptance criterion | Asserts before / after |
|---|---|---|---|
| 1 | `dryRun` (default) lists exactly the buckets that would be removed with total bytes and deletes nothing | "dryRun: true lists exactly the buckets that would be removed, with total bytes, and deletes nothing" | 2 eligible buckets, `bytes` = sum of file sizes, `oldest`/`newest` = month ends (UTC), every file still on disk, no `purge.log.ndjson` |
| 2 | age comes from the bucket NAME — an old bucket with `mtime = now` is still purged | "proven by a test that sets mtime to now on an old bucket and confirms it is still purged" | `utimesSync(bucket, now)` then real run → bucket gone |
| 3 | a bucket newer than the cutoff is never touched even with an ancient mtime | "mtime old, name new — must survive" | new-month bucket with `mtime = 2000-01-01` survives a real run |
| 4 | refuses when `olderThanDays <= archiveWindowDays` | "Purge refuses to run when olderThanDays ≤ the configured archive window (C1), with an actionable message" | rejects with `strictly greater`; every file survives |
| 5 | path-traversal guard refuses `/`, `../../` and a symlink escaping the workflows tree | "an archiveRoot of /, ../../, or a symlink escaping <REACTORY_DATA>/workflows/ is refused before any deletion" | three rejections, external tree untouched |
| 6 | `manifest.index.json` and the `archive/` root survive | "manifest.index.json and the archive/ root survive every run" | both exist after a deleting run |
| 7 | the purge log records what was removed, before the bytes go | "Purge log records what was removed, so a mistaken run is auditable" | NDJSON `bucket` record carries `{bucket, instanceCount, bytes, archivedAt}`; `run` record follows it |
| 8 | orphaned live logs are untouched unless `purgeOrphanedLiveLogs: true` | "Orphaned live logs untouched unless purgeOrphanedLiveLogs: true" | default real run leaves them; opt-in dry run reports; opt-in real run removes; a definition-backed log dir is never a candidate |
| 9 | a bucket holding an archive lock is skipped | C6 "purge must never run concurrently with an archive" | bucket with `.lock` survives and is reported `skipped` |
| 10 | a second purge run is refused while `.purge.lock` exists | C6 run-level lock | rejects with `holds`; nothing deleted |
| 11 | the definition directory survives after its last bucket is deleted | C3.4 "never delete the bucket's parent definition directory" | `archive/core/Def/1.0.0` still exists |
| 12 | the registered YAML definition is valid and never shells out | C5 | `YamlFlowParser` parses it; every step type is registered; no `cli_command`; `dryRun` default `true`, `olderThanDays` default `180` |

Non-goals (recorded so a reviewer does not look for them): restoring a purged
archive, off-host cold storage, and scheduling the workflow.
