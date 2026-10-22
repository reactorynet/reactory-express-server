/**
 * ORG-035: aggregate demographic reporting (pure computation).
 *
 * Reporting is deliberately split in two:
 *
 * - `DemographicsService` owns authorization, cohort resolution and the audit
 *   trail (it needs the request context and the database);
 * - this module owns the *arithmetic*, and nothing else. It has no imports on
 *   purpose: every input arrives as data, so the privacy rules below can be
 *   exercised without a database, a Mongoose connection or a fake context.
 *
 * PRIVACY CONTRACT (read before changing anything here):
 *
 * 1. Suppression happens AFTER aggregation and PER COHORT. A cohort whose
 *    count is below `minimumAggregationGroupSize` is removed from the result
 *    entirely - it is not zeroed, not rounded, and not merged into an "other"
 *    bucket (merging would simply recreate the small cohort under a new name).
 * 2. A suppressed cohort must not be recoverable from anything else in the
 *    payload. That is why no pre-suppression total is ever returned: reporting
 *    a population count alongside surviving cohorts would let a caller derive
 *    the suppressed remainder by subtraction. The only total returned is
 *    `cohortTotal`, which is the number of distinct members behind the
 *    *surviving* buckets, and it is also the percentage denominator.
 * 3. Percentages are computed against that post-suppression denominator and
 *    the denominator is returned explicitly (`percentageDenominator` plus
 *    `denominatorKind`) so a UI cannot silently relabel it.
 * 4. When no bucket survives, the whole definition is reported as
 *    `suppressed: true` with no buckets and no totals, and `suppressedCohorts`
 *    is null. An empty definition and a 1..k-1 cohort are therefore reported
 *    identically - every field matches - so the payload does not reveal
 *    whether anybody answered at all. The count of withheld buckets is
 *    itself a disclosure once nothing survives (2 withheld buckets means two
 *    distinct answers, each held by 1..k-1 members), which is why it is
 *    masked here instead of reported. A *partially* suppressed definition
 *    still reports `suppressedCohorts`, because a caller who can already see
 *    surviving buckets cannot use that number to resurrect a withheld one.
 *
 * `count` is always a number of DISTINCT MEMBERS, never a number of documents
 * and never a number of selections: a multi-valued definition lets one member
 * appear in several buckets, so percentages can sum above 100%. That is
 * expected for a multi-select distribution and is why `denominatorKind` is
 * always `respondents`.
 */

/** Stable CSV column order. Exported so tests and exports cannot drift. */
export const DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS = [
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
] as const;

/** The only denominator this module produces: distinct members. */
export const DEMOGRAPHIC_AGGREGATE_DENOMINATOR_KIND = 'respondents';

/** One bucket of a distribution, after suppression decisions. */
export interface IDemographicAggregateBucket {
  key: string;
  label: string;
  /** Distinct members in this bucket. Always >= the configured threshold. */
  count: number;
  /** `count / percentageDenominator`, rounded to two decimals. */
  percentage: number;
}

/** Aggregation of one definition for one organization and filter set. */
export interface IDemographicDefinitionAggregate {
  definitionKey: string;
  title: string;
  category: string | null;
  valueType: string;
  sensitive: boolean;
  multiValued: boolean;
  /**
   * True when nothing may be reported for this definition: its surviving
   * cohort is empty, either because nobody answered or because every bucket
   * was below the threshold. The two cases are intentionally
   * indistinguishable.
   */
  suppressed: boolean;
  /**
   * How many buckets were withheld. Never how many members they held.
   *
   * Null when `suppressed` is true: once nothing survives, the number of
   * withheld buckets is itself a disclosure (it would tell a caller that two
   * distinct answers exist, each held by 1..k-1 members) and it would make
   * "nobody answered" distinguishable from "a small cohort". Keeping it null
   * in both cases is what makes the two reports identical.
   */
  suppressedCohorts: number | null;
  /** Distinct members behind the surviving buckets. Also the denominator. */
  cohortTotal: number;
  /** Explicit alias of `cohortTotal`, so the UI cannot mislabel it. */
  percentageDenominator: number;
  denominatorKind: string;
  buckets: IDemographicAggregateBucket[];
}

/** Filter echo. Mirrors the GraphQL input; ids stay strings. */
export interface IDemographicAggregateFilterEcho {
  businessUnit: string | null;
  team: string | null;
  region: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  definitionKeys: string[];
  /** True when a structural filter narrowed the member set. */
  cohortRestricted: boolean;
}

/** The whole report. */
export interface IDemographicAggregateReport {
  organization: string;
  /** The threshold actually applied, read from the organization policy. */
  minimumAggregationGroupSize: number;
  filter: IDemographicAggregateFilterEcho;
  definitions: IDemographicDefinitionAggregate[];
  /** Definitions reported (after `definitionKeys` selection). */
  reportedDefinitions: number;
  /** Definitions withheld entirely because their cohort was under threshold. */
  suppressedDefinitions: number;
}

/** Definition fields aggregation needs. A Mongoose document satisfies this. */
export interface IDemographicAggregateDefinitionInput {
  key: string;
  title?: string | null;
  category?: string | null;
  valueType?: string | null;
  multiValued?: boolean | null;
  sensitive?: boolean | null;
  ordinal?: number | null;
  options?: Array<{ key?: string | null; label?: string | null; ordinal?: number | null }> | null;
}

/** Value fields aggregation needs. A Mongoose document satisfies this. */
export interface IDemographicAggregateValueInput {
  user?: unknown;
  value?: unknown;
  key?: string | null;
  definition?: unknown;
}

const toText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'object' && typeof (value as any).toHexString === 'function') {
    return `${(value as any).toHexString()}`;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value.toISOString();
  }
  return `${value}`;
};

/**
 * Normalises a stored value into one or more bucket keys.
 *
 * A value document holds an array when the definition is multi-valued (design
 * decision D11), so an array means "one key per element". `null`, empty strings
 * and empty arrays are *not* data points: they must not create an empty bucket
 * that then gets suppressed and shifts the denominator.
 */
export const normalizeAggregateValueKeys = (value: unknown): string[] => {
  if (value === undefined || value === null) return [];

  if (Array.isArray(value)) {
    const keys: string[] = [];
    value.forEach((entry) => {
      normalizeAggregateValueKeys(entry).forEach((key) => {
        if (keys.indexOf(key) < 0) keys.push(key);
      });
    });
    return keys;
  }

  const text = toText(value);
  return text === null ? [] : [text];
};

interface IResolvedBucketKey {
  key: string;
  label: string;
}

const buildOptionIndex = (
  definition: IDemographicAggregateDefinitionInput,
): Map<string, { key: string; label: string }> => {
  const index = new Map<string, { key: string; label: string }>();
  const options = Array.isArray(definition?.options) ? definition.options : [];

  options.forEach((option) => {
    if (!option || typeof option.key !== 'string') return;
    const lookup = option.key.trim().toLowerCase();
    if (lookup.length === 0) return;
    index.set(lookup, {
      key: option.key,
      label: typeof option.label === 'string' && option.label.trim().length > 0
        ? option.label
        : option.key,
    });
  });

  return index;
};

/**
 * Resolves a raw value to its bucket key/label.
 *
 * Enum values are matched case-insensitively against the definition options so
 * that a legacy value `Permanent` and the option key `permanent` land in ONE
 * bucket - two buckets would each be smaller than they really are and could be
 * suppressed for no reason. An unknown value keeps its raw form rather than
 * being dropped: a distribution that silently discards values is wrong, and the
 * raw bucket is still subject to the same threshold.
 */
const resolveBucketKey = (
  raw: string,
  valueType: string | null | undefined,
  optionIndex: Map<string, { key: string; label: string }>,
): IResolvedBucketKey => {
  if (valueType === 'enum' || valueType === 'multi-enum') {
    const match = optionIndex.get(raw.trim().toLowerCase());
    if (match) return match;
    return { key: raw.trim().toLowerCase(), label: raw };
  }

  if (valueType === 'boolean') {
    const normalised = raw.trim().toLowerCase();
    if (normalised === 'true' || normalised === '1') return { key: 'true', label: 'true' };
    if (normalised === 'false' || normalised === '0') return { key: 'false', label: 'false' };
  }

  return { key: raw, label: raw };
};

/** Thresholds below 1 are meaningless; the service always supplies the policy. */
const normalizeThreshold = (minimumAggregationGroupSize: number | null | undefined): number => {
  if (typeof minimumAggregationGroupSize !== 'number') return 1;
  if (!Number.isFinite(minimumAggregationGroupSize)) return 1;
  const floored = Math.floor(minimumAggregationGroupSize);
  return floored >= 1 ? floored : 1;
};

const roundPercentage = (value: number): number => Math.round(value * 100) / 100;

/**
 * Aggregates one definition's values into a suppressed distribution.
 *
 * The threshold is a parameter, never a constant: the caller supplies the
 * organization's `minimumAggregationGroupSize`, so changing the policy changes
 * the report.
 */
export const buildDemographicDefinitionAggregate = (
  definition: IDemographicAggregateDefinitionInput,
  values: IDemographicAggregateValueInput[],
  minimumAggregationGroupSize: number,
): IDemographicDefinitionAggregate => {
  const threshold = normalizeThreshold(minimumAggregationGroupSize);
  const optionIndex = buildOptionIndex(definition);
  const valueType = definition?.valueType || null;

  /**
   * bucket key -> { key, label, members }. Members are tracked as a Set so a
   * multi-valued definition counts one member once per bucket, and a duplicate
   * array entry cannot inflate a count.
   */
  const buckets = new Map<string, { key: string; label: string; members: Set<string> }>();

  (Array.isArray(values) ? values : []).forEach((value) => {
    const memberKey = toText(value?.user);
    // A value with no owner cannot be attributed to anybody. Skipping it is the
    // only safe choice: inventing a placeholder member would inflate the
    // denominator and could push a cohort over the threshold.
    if (memberKey === null) return;

    const rawKeys = normalizeAggregateValueKeys(value?.value);
    rawKeys.forEach((raw) => {
      const resolved = resolveBucketKey(raw, valueType, optionIndex);
      let bucket = buckets.get(resolved.key);
      if (!bucket) {
        bucket = { key: resolved.key, label: resolved.label, members: new Set<string>() };
        buckets.set(resolved.key, bucket);
      }
      bucket.members.add(memberKey);
    });
  });

  // Aggregate first: every cohort is materialised before any suppression
  // decision, so the threshold is compared against the real count.
  const aggregated = Array.from(buckets.values())
    .map((bucket) => ({ key: bucket.key, label: bucket.label, count: bucket.members.size }))
    // Deterministic order: biggest cohort first, ties broken by key.
    .sort((left, right) => (right.count - left.count) || left.key.localeCompare(right.key));

  // Then suppress, per cohort.
  const surviving = aggregated.filter((bucket) => bucket.count >= threshold);
  const suppressedCohorts = aggregated.length - surviving.length;

  const cohortMembers = new Set<string>();
  surviving.forEach((bucket) => {
    buckets.get(bucket.key)?.members.forEach((member) => cohortMembers.add(member));
  });

  // Nothing survives: withhold the whole definition. No totals, no buckets -
  // otherwise the withheld remainder is recoverable by subtraction.
  if (surviving.length === 0) {
    return {
      definitionKey: definition?.key,
      title: definition?.title || definition?.key,
      category: definition?.category || null,
      valueType: definition?.valueType || 'string',
      sensitive: definition?.sensitive === true,
      multiValued: definition?.multiValued === true,
      suppressed: true,
      // Masked on purpose - see the field doc. Reporting 2 here for a
      // two-bucket 1..k-1 cohort would distinguish it from an empty
      // definition and disclose that the definition has answers at all.
      suppressedCohorts: null,
      cohortTotal: 0,
      percentageDenominator: 0,
      denominatorKind: DEMOGRAPHIC_AGGREGATE_DENOMINATOR_KIND,
      buckets: [],
    };
  }

  const cohortTotal = cohortMembers.size;

  return {
    definitionKey: definition?.key,
    title: definition?.title || definition?.key,
    category: definition?.category || null,
    valueType: definition?.valueType || 'string',
    sensitive: definition?.sensitive === true,
    multiValued: definition?.multiValued === true,
    suppressed: false,
    // A surviving bucket lets no withheld bucket be reconstructed, so the
    // count is safe to disclose here.
    suppressedCohorts,
    // The denominator is the post-suppression cohort, and it is also the only
    // total in the payload. There is deliberately no pre-suppression count.
    cohortTotal,
    percentageDenominator: cohortTotal,
    denominatorKind: DEMOGRAPHIC_AGGREGATE_DENOMINATOR_KIND,
    buckets: surviving.map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      count: bucket.count,
      // Defensive zero guard: unreachable today, because a surviving bucket
      // proves `cohortTotal >= threshold >= 1`, and this is the one branch
      // the coverage report will always show uncovered. Kept so a future
      // reordering cannot emit NaN (or Infinity) into a report or a CSV.
      percentage: cohortTotal > 0 ? roundPercentage((bucket.count / cohortTotal) * 100) : 0,
    })),
  };
};

/**
 * Characters a spreadsheet treats as the start of a formula.
 *
 * `=` `+` `-` `@` are the classic four, and a leading TAB or CR is a known
 * bypass (Excel strips the whitespace and then evaluates what follows). Every
 * one of these can appear in a cell that came from a member: a free-text
 * `string` definition value becomes a bucket key AND a bucket label, and a
 * definition `title` is administrator-supplied. An exported CSV that a
 * spreadsheet opens must never execute those.
 */
const CSV_FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Serialises one CSV cell.
 *
 * Two passes, in this order:
 *
 * 1. **Neutralise formula injection.** A cell whose first character is one of
 *    `CSV_FORMULA_PREFIXES` is prefixed with a single quote, so Excel/Sheets/
 *    LibreOffice show it as text instead of evaluating it. This is applied to
 *    every cell - including `definition_title`, `bucket_key` and `bucket_label`
 *    - because any of them can carry attacker-controlled text.
 * 2. **Quote for CSV structure.** A cell containing a quote, comma, CR or LF
 *    is quoted with embedded quotes doubled, as RFC 4180 requires.
 *
 * The order matters: neutralising first means the injected `'` is inside the
 * quoted field, so a value like `=HYPERLINK("http://x","y")` becomes
 * `"'=HYPERLINK(""http://x"",""y"")"` - inert text that still round-trips
 * through a CSV parser as the original value plus the guard quote.
 */
const csvCell = (value: unknown): string => {
  if (value === undefined || value === null) return '';

  const text = `${value}`;
  const first = text.charAt(0);
  const neutralised = CSV_FORMULA_PREFIXES.indexOf(first) >= 0 ? `'${text}` : text;

  if (
    neutralised.indexOf('"') >= 0 ||
    neutralised.indexOf(',') >= 0 ||
    neutralised.indexOf('\n') >= 0 ||
    neutralised.indexOf('\r') >= 0
  ) {
    return `"${neutralised.split('"').join('""')}"`;
  }
  return neutralised;
};

/**
 * Serialises a report to CSV.
 *
 * A suppressed definition still produces a row (with empty bucket columns), so
 * an export cannot be mistaken for "this definition does not exist". Buckets are
 * already ordered deterministically by the aggregate builder.
 */
export const buildDemographicAggregateCsv = (report: IDemographicAggregateReport): string => {
  const lines: string[] = [DEMOGRAPHIC_AGGREGATE_CSV_COLUMNS.join(',')];

  (report?.definitions || []).forEach((definition) => {
    const base = [
      report.organization,
      report.minimumAggregationGroupSize,
      definition.definitionKey,
      definition.title,
      definition.category,
      definition.valueType,
      definition.sensitive === true,
      definition.suppressed === true,
      definition.suppressedCohorts,
      // `suppressedCohorts` is null for a suppressed definition, and
      // `csvCell` renders null as an empty cell - the export says "suppressed"
      // without saying how much was suppressed.
      definition.cohortTotal,
      definition.percentageDenominator,
      definition.denominatorKind,
    ];

    if (definition.buckets.length === 0) {
      lines.push([...base, '', '', '', ''].map(csvCell).join(','));
      return;
    }

    definition.buckets.forEach((bucket) => {
      lines.push([
        ...base,
        bucket.key,
        bucket.label,
        bucket.count,
        typeof bucket.percentage === 'number' ? bucket.percentage.toFixed(2) : '',
      ].map(csvCell).join(','));
    });
  });

  return `${lines.join('\n')}\n`;
};
