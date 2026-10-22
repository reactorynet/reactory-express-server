import {
  DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS,
  buildDemographicAggregateCsv,
  buildDemographicDefinitionAggregate,
  normalizeAggregateValueKeys,
} from '../demographicAggregates';
import type { IDemographicAggregateReport } from '../demographicAggregates';

/**
 * ORG-035: the pure aggregation/privacy rules.
 *
 * These tests deliberately do not touch a database or a service: the privacy
 * contract is arithmetic, so it is asserted on arithmetic. The service-level
 * behaviour (authorization, cohort resolution, audit) lives in
 * `services/__tests__/DemographicsAggregates.test.ts`.
 */

const GENDER = {
  key: 'gender',
  title: 'Gender',
  category: 'personal',
  valueType: 'enum',
  multiValued: false,
  sensitive: false,
  options: [
    { key: 'male', label: 'Male', ordinal: 1 },
    { key: 'female', label: 'Female', ordinal: 2 },
    { key: 'other', label: 'Other', ordinal: 3 },
  ],
};

const LANGUAGES = {
  key: 'languages',
  title: 'Languages',
  category: 'personal',
  valueType: 'multi-enum',
  multiValued: true,
  sensitive: false,
  options: [
    { key: 'en', label: 'English' },
    { key: 'af', label: 'Afrikaans' },
    { key: 'zu', label: 'Zulu' },
  ],
};

const DISABILITY = {
  key: 'disabilityStatus',
  title: 'Disability status',
  category: 'personal',
  valueType: 'enum',
  multiValued: false,
  sensitive: true,
  options: [
    { key: 'disability', label: 'Disability' },
    { key: 'no-disability', label: 'No disability' },
  ],
};

/** Distributes `count` members over one bucket key, with deterministic ids. */
const cohort = (value: string, count: number, offset = 0): Array<{ user: string; value: string }> =>
  Array.from({ length: count }, (_unused, index) => ({
    user: `member-${offset + index}`,
    value,
  }));

describe('demographic aggregate arithmetic (ORG-035)', () => {
  describe('counts and distributions', () => {
    it('counts distinct members per bucket and reports percentages against the cohort total', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 9), ...cohort('female', 6, 100)],
        5,
      );

      expect(aggregate.suppressed).toBe(false);
      expect(aggregate.suppressedCohorts).toBe(0);
      expect(aggregate.cohortTotal).toBe(15);
      expect(aggregate.percentageDenominator).toBe(15);
      expect(aggregate.denominatorKind).toBe('respondents');
      expect(aggregate.buckets).toEqual([
        { key: 'male', label: 'Male', count: 9, percentage: 60 },
        { key: 'female', label: 'Female', count: 6, percentage: 40 },
      ]);
    });

    it('orders buckets by count descending, then key, so exports are stable', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('other', 5), ...cohort('female', 5, 100), ...cohort('male', 7, 200)],
        5,
      );

      expect(aggregate.buckets.map((bucket) => bucket.key)).toEqual(['male', 'female', 'other']);
    });

    it('counts one member once per bucket when the definition is multi-valued', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        LANGUAGES,
        [
          { user: 'member-1', value: ['en', 'af'] },
          { user: 'member-2', value: ['en'] },
          { user: 'member-3', value: ['en'] },
          { user: 'member-4', value: ['af'] },
          { user: 'member-5', value: ['af'] },
        ],
        3,
      );

      // Distinct members behind the surviving buckets, not the number of
      // selections: 5 people made 6 selections.
      expect(aggregate.cohortTotal).toBe(5);
      expect(aggregate.buckets).toEqual([
        { key: 'af', label: 'Afrikaans', count: 3, percentage: 60 },
        { key: 'en', label: 'English', count: 3, percentage: 60 },
      ]);
      // Documented consequence of multi-select distributions: percentages sum
      // above 100 and the denominator kind says so.
      expect(aggregate.denominatorKind).toBe('respondents');
    });

    it('merges legacy casing into one bucket instead of splitting a cohort', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 4), ...cohort('Male', 4, 100)],
        5,
      );

      expect(aggregate.buckets).toHaveLength(1);
      expect(aggregate.buckets[0].count).toBe(8);
    });

    it('keeps an unmapped value as its own bucket rather than discarding it', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 5), ...cohort('non-binary', 5, 100)],
        5,
      );

      expect(aggregate.buckets.map((bucket) => bucket.key).sort()).toEqual(['male', 'non-binary']);
    });

    it('treats null and empty values as "no answer", not as an empty bucket', () => {
      expect(normalizeAggregateValueKeys(null)).toEqual([]);
      expect(normalizeAggregateValueKeys('')).toEqual([]);
      expect(normalizeAggregateValueKeys([])).toEqual([]);
      expect(normalizeAggregateValueKeys(['en', '', null, 'en'])).toEqual(['en']);

      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [{ user: 'member-1', value: null }, ...cohort('male', 5)],
        5,
      );

      expect(aggregate.cohortTotal).toBe(5);
      expect(aggregate.buckets).toHaveLength(1);
    });
  });

  describe('suppression', () => {
    it('suppresses a cohort below the threshold and reports how many were withheld', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 6), ...cohort('female', 3, 100)],
        5,
      );

      expect(aggregate.suppressed).toBe(false);
      expect(aggregate.suppressedCohorts).toBe(1);
      expect(aggregate.buckets.map((bucket) => bucket.key)).toEqual(['male']);
      // The suppressed cohort is gone, not zeroed and not merged.
      expect(aggregate.buckets.some((bucket) => bucket.count === 0)).toBe(false);

      // Percentages use the post-suppression denominator.
      expect(aggregate.cohortTotal).toBe(6);
      expect(aggregate.buckets[0].percentage).toBe(100);
    });

    it('takes the threshold from the caller, never from a constant', () => {
      const values = [...cohort('male', 6), ...cohort('female', 3, 100)];

      const strict = buildDemographicDefinitionAggregate(GENDER, values, 5);
      const relaxed = buildDemographicDefinitionAggregate(GENDER, values, 3);

      expect(strict.buckets.map((bucket) => bucket.key)).toEqual(['male']);
      expect(strict.suppressedCohorts).toBe(1);

      // Same data, same code - only the policy changed.
      expect(relaxed.buckets.map((bucket) => bucket.key)).toEqual(['male', 'female']);
      expect(relaxed.suppressedCohorts).toBe(0);
    });

    it('treats a bucket exactly at the threshold as reportable', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 5), ...cohort('female', 4, 100)],
        5,
      );

      expect(aggregate.buckets.map((bucket) => bucket.key)).toEqual(['male']);
    });

    it('withholds the whole definition when no bucket survives, revealing no totals', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 3), ...cohort('female', 2, 100)],
        5,
      );

      expect(aggregate.suppressed).toBe(true);
      expect(aggregate.buckets).toEqual([]);
      expect(aggregate.cohortTotal).toBe(0);
      expect(aggregate.percentageDenominator).toBe(0);
    });

    it('masks suppressedCohorts when nothing survives, so it is not a disclosure', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 3), ...cohort('female', 2, 100)],
        5,
      );

      // Two buckets existed and both were withheld. Reporting "2" here would
      // tell the caller the definition has two distinct answers, each held by
      // 1..k-1 members - so the count is masked instead.
      expect(aggregate.suppressed).toBe(true);
      expect(aggregate.suppressedCohorts).toBeNull();
    });

    it('reports an empty definition exactly like a fully suppressed one, suppressedCohorts included', () => {
      const empty = buildDemographicDefinitionAggregate(GENDER, [], 5);
      const suppressed = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 2), ...cohort('female', 2, 100)],
        5,
      );

      // Every field must match - including suppressedCohorts, which is the
      // field that used to falsify this test's name (it was 2 for the
      // suppressed case and 0 for the empty one). Comparing the whole object
      // is the only assertion that cannot be quietly side-stepped by a future
      // field being added.
      expect(suppressed).toEqual(empty);
      expect(empty.suppressedCohorts).toBeNull();
      expect(suppressed.suppressedCohorts).toBeNull();
      expect(empty.suppressed).toBe(true);
      expect(suppressed.suppressed).toBe(true);
      expect(empty.buckets).toEqual([]);
      expect(suppressed.buckets).toEqual([]);
      expect(empty.cohortTotal).toBe(0);
      expect(suppressed.cohortTotal).toBe(0);
    });
  });

  describe('a suppressed cohort cannot be recovered from totals', () => {
    it('exposes no pre-suppression population count', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 6), ...cohort('female', 3, 100)],
        5,
      );

      const totals = {
        cohortTotal: aggregate.cohortTotal,
        percentageDenominator: aggregate.percentageDenominator,
      };

      // 9 people answered, but the payload only ever states 6: the suppressed
      // 3 is not derivable from any returned number.
      expect(totals).toEqual({ cohortTotal: 6, percentageDenominator: 6 });
      expect(aggregate.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(6);
      expect(Object.keys(aggregate).sort()).toEqual([
        'buckets',
        'category',
        'cohortTotal',
        'definitionKey',
        'denominatorKind',
        'multiValued',
        'percentageDenominator',
        'sensitive',
        'suppressed',
        'suppressedCohorts',
        'title',
        'valueType',
      ]);
    });

    it('does not leak the withheld remainder through the percentages', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        GENDER,
        [...cohort('male', 6), ...cohort('female', 3, 100)],
        5,
      );

      expect(aggregate.buckets[0].percentage).toBe(100);
      expect(aggregate.buckets.reduce((sum, bucket) => sum + bucket.percentage, 0)).toBe(100);
    });
  });

  describe('sensitive definitions', () => {
    it('aggregates a sensitive definition but flags it', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        DISABILITY,
        [...cohort('no-disability', 8), ...cohort('disability', 2, 100)],
        5,
      );

      expect(aggregate.sensitive).toBe(true);
      expect(aggregate.cohortTotal).toBe(8);
      expect(aggregate.suppressedCohorts).toBe(1);
    });
  });

  describe('CSV export', () => {
    const report: IDemographicAggregateReport = {
      organization: 'org-1',
      minimumAggregationGroupSize: 5,
      filter: {
        businessUnit: null,
        team: null,
        region: null,
        effectiveFrom: null,
        effectiveTo: null,
        definitionKeys: [],
        cohortRestricted: false,
      },
      definitions: [
        buildDemographicDefinitionAggregate(
          GENDER,
          [...cohort('male', 9), ...cohort('female', 6, 100)],
          5,
        ),
        buildDemographicDefinitionAggregate(GENDER, [], 5),
      ],
      reportedDefinitions: 2,
      suppressedDefinitions: 1,
    };

    it('starts with a header row in a stable, declared column order', () => {
      const lines = buildDemographicAggregateCsv(report).split('\n');

      expect(lines[0]).toBe(DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS.join(','));
      expect(DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS).toEqual([
        'organization',
        'minimum_group_size',
        'definition_key',
        'definition_title',
        'category',
        'value_type',
        'sensitive',
        'definition_suppressed',
        'suppressed_cohorts',
        'cohort_total',
        'percentage_denominator',
        'denominator_kind',
        'bucket_key',
        'bucket_label',
        'count',
        'percentage',
      ]);
      expect(lines[lines.length - 1]).toBe('');
    });

    it('emits one row per bucket plus a row for a suppressed definition', () => {
      const rows = buildDemographicAggregateCsv(report)
        .trimEnd()
        .split('\n')
        .slice(1)
        .map((line) => line.split(','));

      expect(rows).toHaveLength(3);
      expect(rows[0][2]).toBe('gender');
      expect(rows[0][12]).toBe('male');
      expect(rows[1][12]).toBe('female');
      // The suppressed definition is still present, with bucket columns empty.
      expect(rows[2][7]).toBe('true');
      expect(rows[2].slice(12)).toEqual(['', '', '', '']);
    });

    it('writes the applied threshold and denominator on every row', () => {
      const rows = buildDemographicAggregateCsv(report).trimEnd().split('\n').slice(1);

      rows.forEach((line) => {
        const cells = line.split(',');
        expect(cells[1]).toBe('5');
        // The suppressed definition reports 0 only because it reports nothing
        // at all; every reported row states the same 15-person denominator.
        if (cells[7] === 'false') {
          expect(cells[10]).toBe('15');
        }
        expect(cells[11]).toBe('respondents');
      });
    });

    it('quotes cells containing separators or quotes', () => {
      const csv = buildDemographicAggregateCsv({
        ...report,
        definitions: [
          buildDemographicDefinitionAggregate(
            { ...GENDER, title: 'Gender, "preferred"' },
            cohort('male', 5),
            5,
          ),
        ],
      });

      expect(csv.split('\n')[1]).toContain('"Gender, ""preferred"""');
    });
  });
});
