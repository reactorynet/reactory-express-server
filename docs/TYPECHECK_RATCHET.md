# The type-check ratchet

CI runs `yarn typecheck`, which is `node scripts/ci/typecheck-ratchet.js`. It is
the gate for TypeScript errors in a repository that has a large pre-existing
backlog (`typecheck-baseline.json`).

## What the gate measures

The gate is **per file**, not a total. For every file tsc reports, it compares
the current error count with the allowance recorded in
`typecheck-baseline.json`:

- more errors than the allowance → **red** (`New type errors in N file(s)`);
- fewer → reported as an improvement, but **green**;
- a file with errors that has no entry → the allowance is 0, so **red**.

A falling total does **not** mean the gate is green: one file improving by ten
errors and another gaining one is still a regression. That is deliberate. A
total-count gate would let a change buy its way past the check by deleting
unrelated code, and it would hide a new error in a file somebody is already
fixing.

## Running it

```bash
yarn typecheck                 # check (what CI runs)
yarn typecheck:update-baseline # rewrite typecheck-baseline.json
yarn typecheck:full            # plain `tsc --noEmit`, every error, no gate
```

## "Not checked" — absent modules

A Reactory backend is any combination of modules, and each module under
`src/modules` is its own repository. A checkout that lacks a module cannot
type-check the files that import it: tsc reports `Cannot find module`, which
describes the checkout rather than the code.

Those files, and the entries of the absent modules themselves, are reported
under `Not checked:` and are exempt from both directions of the comparison.
CI checks out the server alone, so this is normal there; the module entries
only come into play in a checkout that contains the module.

Some modules — `reactory-email`, `reactory-sms`, `reactory-whatsapp`,
`reactory-atlassian` — are optional and absent from *every* checkout, so a
handful of files are always in that list.

## Refreshing the baseline

`--update` records the current count of every file it *can* check and
**carries over** the previous entry of every file it cannot. That is what makes
the refresh safe to run from a checkout that lacks modules: it cannot lower a
module's allowance by accident. Running it from a server-only checkout and from
a full checkout produces the same file.

Prefer fixing an error to baselining it. Refresh when:

- a file genuinely improved (the gate will have printed it under
  `N file(s) improved`), or
- new errors are accepted as backlog (for example a module that landed before
  the gate covered it), in which case say so in the commit message.
- the numbers drifted because a module was added or removed.

`total` in the baseline is the sum of the allowances, which includes entries
carried over for files the updating checkout could not check. It is a budget,
not the number of errors in the tree; the check prints the live count
separately.
