/**
 * Contributor documentation must point at the canonical module documentation.
 *
 * The canonical pages for a module live in the `reactory-docs` corpus, not in
 * this repository (see the documentation ownership model: narrative lives
 * centrally, the module repo keeps only code-adjacent contributor docs).
 *
 * This suite guards the half of that contract which is still in this repo: the
 * module README and AGENT.md must send the reader to the corpus, must not
 * pretend the corpus pages live here, and must not restate the enumerations
 * that the generated reference owns.
 *
 * The full documentation contract for `reactory-core` — template sections,
 * mandatory limitation statements, generated-file freshness, prose counts —
 * is enforced in `reactory-docs` by `scripts/verify-docs.js`, because that is
 * where the pages are. A doc-freshness test here could not see them.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_DIR = path.join(ROOT, 'src', 'modules', 'reactory-core');
const README = path.join(MODULE_DIR, 'readme.md');
const AGENT = path.join(MODULE_DIR, 'AGENT.md');

const CORPUS_PAGE =
  'https://github.com/reactorynet/reactory-docs/blob/master/06-modules/reactory-core/README.md';
const CORPUS_REFERENCE =
  'https://github.com/reactorynet/reactory-docs/blob/master/07-reference/modules/reactory-core.md';

const read = (p) => fs.readFileSync(p, 'utf8');

describe('reactory-core contributor documentation', () => {
  it.each([
    ['readme.md', README],
    ['AGENT.md', AGENT],
  ])('%s links to the canonical module page in reactory-docs', (_label, file) => {
    expect(fs.existsSync(file)).toBe(true);
    expect(read(file)).toContain(CORPUS_PAGE);
  });

  it.each([
    ['readme.md', README],
    ['AGENT.md', AGENT],
  ])('%s links to the generated reference in reactory-docs', (_label, file) => {
    expect(read(file)).toContain(CORPUS_REFERENCE);
  });

  it.each([
    ['readme.md', README],
    ['AGENT.md', AGENT],
  ])('%s does not link to a docs/ tree inside this repository', (_label, file) => {
    const markdown = read(file);
    // Relative links into a local docs/ tree would 404 now that the narrative
    // and generated pages live in the corpus.
    expect(markdown).not.toMatch(/\]\(\.\.\/[^)]*docs\/06-modules/);
    expect(markdown).not.toMatch(/\]\(\.\.\/[^)]*docs\/07-reference/);
  });

  it.each([
    ['readme.md', README],
    ['AGENT.md', AGENT],
  ])('%s does not restate the service/model/form enumerations', (_label, file) => {
    const markdown = read(file);
    // These exact stale counts appeared in AGENT.md before the generated
    // reference took ownership of the enumerations.
    expect(markdown).not.toMatch(/38 total/);
    expect(markdown).not.toMatch(/\(30 entries\)/);
    expect(markdown).not.toMatch(/\(22 entries\)/);
  });

  it('readme.md documents regeneration in the reactory-docs checkout', () => {
    const markdown = read(README);
    expect(markdown).toContain('generate-core-module-reference.js');
    expect(markdown).toContain('reactory-docs');
    expect(markdown).toContain('--check');
  });

  it('readme.md states the authority when the two disagree', () => {
    // The ownership model: a repo README is never normative for a capability claim.
    expect(read(README)).toMatch(/module page wins|module page is right/i);
  });
});
