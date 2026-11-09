# Security policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Use GitHub's private vulnerability reporting for this repository:
**Security → Report a vulnerability** (or
`https://github.com/reactorynet/reactory-express-server/security/advisories/new`).
You will get an acknowledgement within five working days. Reports are
triaged by the code owners listed in `.github/CODEOWNERS`.

## Supported versions

Only the default branch (`master`) receives security fixes.
Downstream organisations that mirror this repository pick fixes up through
their regular upstream sync.

## What is in place on this repository

- Protected default branch: pull request with a code-owner review, signed
  commits, no force pushes, administrators included.
- Secret scanning with push protection, Dependabot alerts and security
  updates, CodeQL and dependency review on every pull request, OpenSSF
  Scorecard weekly.
- GitHub Actions limited to GitHub-authored and verified-creator actions,
  pinned to commit SHAs, with a read-only default token.
