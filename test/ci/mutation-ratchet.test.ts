/**
 * The mutation ratchet (scripts/ci/mutation-ratchet.js) gates Stryker results
 * per file against mutation-baseline.json. These tests exercise its rules
 * (scripts/ci/mutationRatchet.js) on fixture reports, so they run without
 * Stryker. The cases that matter: a file only fails on MORE undetected mutants
 * than its allowance; a file a run did not measure is left alone by the check
 * and by the refresh; an aborted run is refused rather than read as clean.
 */
import * as path from 'path';

const {
  summariseReport,
  compareWithBaseline,
  mergeBaseline,
  totals,
} = require('../../scripts/ci/mutationRatchet');

const mutants = (...statuses: string[]) => ({ mutants: statuses.map((status, i) => ({ id: String(i), status })) });

describe('mutation ratchet', () => {
  describe('summariseReport', () => {
    it('counts Survived and NoCoverage as undetected, Killed and Timeout as detected, and ignores errors', () => {
      const summary = summariseReport({
        files: {
          'src/a.ts': mutants('Killed', 'Timeout', 'Survived', 'NoCoverage', 'CompileError', 'RuntimeError', 'Ignored'),
        },
      });

      expect(summary['src/a.ts']).toEqual({
        mutants: 4,
        detected: 2,
        undetected: 2,
        survived: 1,
        noCoverage: 1,
        score: 50,
      });
    });

    it('keys files relative to the project root when the report uses absolute paths', () => {
      const root = path.resolve('/repo');
      const summary = summariseReport({ files: { [path.join(root, 'src', 'b.ts')]: mutants('Killed') } }, root);

      expect(Object.keys(summary)).toEqual(['src/b.ts']);
    });

    it('reports a null score for a file with no measurable mutants', () => {
      expect(summariseReport({ files: { 'src/c.ts': mutants('CompileError') } })['src/c.ts'].score).toBeNull();
    });

    it('refuses a report with mutants that never ran', () => {
      expect(() => summariseReport({ files: { 'src/a.ts': mutants('Killed', 'Pending') } })).toThrow(/incomplete run/);
    });

    it('refuses something that is not a report', () => {
      expect(() => summariseReport({})).toThrow(/Not a Stryker JSON report/);
    });
  });

  describe('compareWithBaseline', () => {
    const baseline = { files: { 'src/a.ts': { mutants: 10, undetected: 3 } } };

    it('fails a file with more undetected mutants than its allowance', () => {
      const summary = summariseReport({ files: { 'src/a.ts': mutants('Survived', 'Survived', 'Survived', 'NoCoverage') } });

      const { regressions, improvements } = compareWithBaseline({ summary, baseline });

      expect(regressions).toEqual([{ file: 'src/a.ts', undetected: 4, allowed: 3, mutants: 4, isNew: false }]);
      expect(improvements).toEqual([]);
    });

    it('passes a file at its allowance and reports one below it as an improvement', () => {
      const atAllowance = summariseReport({ files: { 'src/a.ts': mutants('Survived', 'Survived', 'Survived') } });
      const below = summariseReport({ files: { 'src/a.ts': mutants('Survived', 'Killed', 'Killed') } });

      expect(compareWithBaseline({ summary: atAllowance, baseline })).toEqual({ regressions: [], improvements: [] });
      expect(compareWithBaseline({ summary: below, baseline }).improvements).toEqual([
        { file: 'src/a.ts', undetected: 1, allowed: 3, mutants: 3 },
      ]);
    });

    it('allows a file without an entry no undetected mutants', () => {
      const summary = summariseReport({ files: { 'src/new.ts': mutants('Killed', 'Survived') } });

      expect(compareWithBaseline({ summary, baseline }).regressions).toEqual([
        { file: 'src/new.ts', undetected: 1, allowed: 0, mutants: 2, isNew: true },
      ]);
      expect(
        compareWithBaseline({ summary: summariseReport({ files: { 'src/new.ts': mutants('Killed') } }), baseline }).regressions,
      ).toEqual([]);
    });

    it('ignores baseline files the run did not measure', () => {
      const summary = summariseReport({ files: { 'src/other.ts': mutants('Killed') } });

      expect(compareWithBaseline({ summary, baseline })).toEqual({ regressions: [], improvements: [] });
    });
  });

  describe('mergeBaseline', () => {
    const previous = {
      files: {
        'src/a.ts': { mutants: 10, undetected: 3, score: 70 },
        'src/b.ts': { mutants: 4, undetected: 1, score: 75 },
      },
    };

    it('takes the measured files and carries the rest over unchanged', () => {
      const summary = summariseReport({ files: { 'src/a.ts': mutants(...Array(9).fill('Killed'), 'Survived') } });

      const merged = mergeBaseline({ summary, previous });

      expect(merged.files).toEqual({
        'src/a.ts': { mutants: 10, undetected: 1, score: 90 },
        'src/b.ts': { mutants: 4, undetected: 1, score: 75 },
      });
      expect(merged.carried).toEqual(['src/b.ts']);
      expect(merged.mutants).toBe(14);
      expect(merged.undetected).toBe(2);
      expect(merged.score).toBeCloseTo(85.71, 2);
    });

    it('flags measured files that lost mutants, which is what a line-range run looks like', () => {
      const summary = summariseReport({ files: { 'src/a.ts': mutants('Killed', 'Killed') } });

      expect(mergeBaseline({ summary, previous }).shrunk).toEqual([{ file: 'src/a.ts', mutants: 2, was: 10 }]);
    });

    it('writes files in a stable order', () => {
      const summary = summariseReport({ files: { 'src/z.ts': mutants('Killed'), 'src/0.ts': mutants('Killed') } });

      expect(Object.keys(mergeBaseline({ summary, previous }).files)).toEqual(['src/0.ts', 'src/a.ts', 'src/b.ts', 'src/z.ts']);
    });
  });

  it('totals detected and undetected mutants across files', () => {
    const summary = summariseReport({ files: { 'src/a.ts': mutants('Killed', 'Survived'), 'src/b.ts': mutants('Timeout', 'Killed') } });

    expect(totals(summary)).toEqual({ mutants: 4, detected: 3, undetected: 1, score: 75 });
  });
});
