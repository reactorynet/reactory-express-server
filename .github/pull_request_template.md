<!--
  Reactory pull request template
  ----------------------------------------------------------------------------
  Canonical source: reactorynet/.github → standards/pull_request_template.md

  Do NOT hand-edit the copies in individual repositories. Change this file and
  run `scripts/sync-pr-template.sh --apply` to propagate it. Use
  `scripts/sync-pr-template.sh --check` in CI to detect drift.

  Keep the section headings intact — reviewers and automation rely on them.
  Delete the HTML comment blocks when you open the PR; they are author guidance.
-->

## Summary

<!-- One or two sentences: what changed and why. Link the driving ticket. -->

- **Ticket / issue:** `REACTORY-…`
- **Related PRs / commits:**
- **Reviewer focus:** <!-- e.g. "resolver error handling in src/modules/core" -->

## Type of change

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor (no functional change)
- [ ] Performance improvement
- [ ] Documentation
- [ ] Build / CI / tooling
- [ ] Dependency upgrade
- [ ] **Breaking change**

## What changed

<!-- Bullet the meaningful changes. Call out anything a reviewer might otherwise miss. -->
-
-

## How was this tested?

### Automated

- [ ] Type check (`yarn typecheck` / `tsc --noEmit`)
- [ ] Lint (`yarn lint`)
- [ ] Unit tests (`yarn test`) — suites touched:
- [ ] Integration tests (`yarn test:integration`) — server only, and only where relevant
- [ ] Not applicable (docs/config only) — rationale:

### Manual verification

<!-- Exact steps a reviewer can follow: environment, client config, role, seed data. -->
1.
2.

**Result:** <!-- pass/fail, plus any flaky or skipped tests and why -->

## UI / UX evidence

<!-- Required for reactory-pwa-client and anything user-facing. Delete if not applicable. -->

| Before | After |
| --- | --- |
| <!-- screenshot --> | <!-- screenshot --> |

- [ ] Keyboard accessible; focus order and focus traps verified
- [ ] Verified at mobile / tablet / desktop breakpoints
- [ ] Light and dark theme checked
- [ ] Copy is translated via `reactory-data/i18n` (no hard-coded strings)
- [ ] Loading, empty and error states covered

## Impact analysis

| Area | Impact |
| --- | --- |
| Server modules affected | e.g. `src/modules/reactory-core` |
| Client components / plugins affected | |
| GraphQL schema / resolver changes | None / describe types, queries, mutations |
| Database migrations | None / collection + migration name |
| Config or environment variables | None / names + defaults + `.env.example` updated |
| Submodule version bumps | None / submodule + new SHA |
| Cross-repo dependency | None / repo + minimum version |
| i18n key changes | None / keys added or renamed |

## Breaking changes & rollback

**Is this a breaking change?** <!-- No — or state exactly what breaks and for whom. -->

**Rollback plan:**

- [ ] Reverting this PR is sufficient
- [ ] Requires config revert — describe:
- [ ] Requires data / migration rollback — describe:
- [ ] Requires coordinated client + server release ordering — describe:

## Security considerations

- [ ] No secrets, tokens or credentials committed (reviewed `git diff` and `.env*` files)
- [ ] Authorisation and permission checks reviewed for new endpoints, resolvers or menu entries
- [ ] User input validated at trust boundaries; query parameters and payloads bounded
- [ ] New or upgraded dependencies checked for advisories (`yarn audit` / `npm audit`)
- [ ] No sensitive data in logs, metrics or error responses
- [ ] Not applicable — rationale:

## Documentation

- [ ] `reactory-docs` updated
- [ ] Inline JSDoc / API comments added for new public surface
- [ ] `.env.example` or config templates updated
- [ ] `CHANGELOG.md` updated (if this repo keeps one)
- [ ] No documentation required

## Author checklist

- [ ] Branch rebased on latest `master` / `main` and merges cleanly
- [ ] Commits are signed (`git log --show-signature`) and follow Conventional Commits
- [ ] No debug logging, commented-out code or unrelated drive-by changes
- [ ] Full diff reviewed line by line before requesting review
- [ ] Ticket reference present in the title or description

## Reviewer checklist

- [ ] Behaviour matches the stated intent and the linked ticket
- [ ] Tests cover the changed paths and assert something meaningful
- [ ] Error handling and edge cases handled, not just the happy path
- [ ] No obvious performance regression (N+1 queries, unbounded loops, needless re-renders)
- [ ] Public API or contract changes have explicit sign-off
- [ ] Naming and structure consistent with surrounding code
