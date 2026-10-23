import fs from 'fs';
import path from 'path';
import Reactory from '@reactorynet/reactory-core';
import {
  DEMOGRAPHICS_SERVICE_ID,
} from '@reactory/server-modules/reactory-core/cli/demographics/DemographicsCli';
import {
  migrateLegacyDemographics,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicsMigration';
import type {
  ILegacyMigrationReport,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicsMigration';
import {
  createDemographicsServiceTarget,
  createMongoLegacyDemographicsSource,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicsMongoSource';

/**
 * ORG-040: `reactory demographics-legacy-migrate`.
 *
 * Extends the ORG-030 demographics CLI (same directory, same
 * `DemographicsService` dependency) with the legacy-data migration. It is a
 * separate command definition, not a second CLI: the ORG-030 command keeps its
 * `demographics-seed` stem and argument contract untouched, while this command
 * gets its own stem so the two can be run - and reasoned about - independently.
 *
 * Dry run by default. Nothing is written without `--apply`; the JSON report is
 * the product of the default invocation and lists, per definition, what would be
 * written and why everything else was skipped (missing definition, unresolvable
 * organization, unmapped value, invalid value, dangling reference, existing
 * value).
 *
 * Usage:
 *   reactory demographics-legacy-migrate
 *   reactory demographics-legacy-migrate --apply
 *   reactory demographics-legacy-migrate --apply --organizationIds=<id>,<id>
 *   reactory demographics-legacy-migrate --report=.ai-agent/legacy-migration.json
 *
 * Exit codes:
 *   0  the run completed (dry run or apply), even when rows were skipped: skips
 *      are reported data, not failures.
 *   1  argument parsing failed, the demographics service is unavailable, the
 *      migration threw, or at least one write failed.
 */

const HelpText = `
Migrates legacy demographics (PersonalDemographic, UserDemographics and the
eight OrganizationDemographicsSettings booleans) into the ORG-003 definition /
value model.

DRY RUN BY DEFAULT. Pass --apply to write. The report lists every definition
with counts of rows written and skipped, plus the reason for each skip.

Parameters:
  --apply                    Write the values and the definition enabled flags.
  --dry-run                  Explicit no-op mode (the default).
  --organizationIds <ids>    Comma separated organization ids. When omitted every
                             organization referenced by the legacy data is
                             considered.
  --source <personal|user|all>
                             Which legacy value collections to migrate
                             (default: all).
  --no-enablement            Do not map the eight OrganizationDemographicsSettings
                             booleans onto definition enablement.
  --overwrite                Replace existing values that differ. Without this an
                             existing different value is reported as
                             existing-differs and left alone.
  --max-skip-details <n>     Maximum actionable skip details in the report
                             (default 100; counts are always complete).
  --report <path>            Also write the JSON report to this file.
  -h --help                  Show this help.

Exit codes:
  0  completed (including a dry run and runs with skipped rows)
  1  bad arguments, service unavailable, migration threw, at least one value
     write failed, or at least one definition-enablement write failed

Examples:
  reactory demographics-legacy-migrate
  reactory demographics-legacy-migrate --apply
  reactory demographics-legacy-migrate --apply --organizationIds=665f0c1a2b3c4d5e6f708192
  reactory demographics-legacy-migrate --report=.ai-agent/legacy-migration-dry-run.json
`;

export interface ILegacyDemographicsMigrationCliArgs {
  apply: boolean;
  organizationIds?: string[];
  includePersonalDemographics: boolean;
  includeUserDemographics: boolean;
  includeEnablement: boolean;
  overwrite: boolean;
  maxSkipDetails?: number;
  reportPath?: string;
  help: boolean;
}

/** Splits a comma separated id list, dropping blanks and duplicates. */
const parseIdList = (value: string | null): string[] | undefined => {
  if (value === null || value === undefined) return undefined;
  const ids = Array.from(new Set(
    value
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  ));
  return ids.length > 0 ? ids : undefined;
};

const parseBoolean = (flag: string, value: string | null): boolean => {
  if (value === null) return true;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  throw new Error(`[${flag}] expects true or false, received '${value}'`);
};

/**
 * Parses `--flag value`, `--flag=value`, `-h` and bare `--help`. Unknown flags
 * are rejected: a typo must not quietly turn a filtered run into an unfiltered
 * one.
 */
export const parseLegacyDemographicsMigrationArgs = (
  vargs: string[] = [],
): ILegacyDemographicsMigrationCliArgs => {
  const args: ILegacyDemographicsMigrationCliArgs = {
    apply: false,
    includePersonalDemographics: true,
    includeUserDemographics: true,
    includeEnablement: true,
    overwrite: false,
    help: false,
  };

  const kwargs = Array.isArray(vargs) ? vargs : [];

  for (let index = 0; index < kwargs.length; index += 1) {
    const raw = `${kwargs[index]}`;
    let flag = raw;
    let value: string | null = null;

    if (raw.includes('=')) {
      const eq = raw.indexOf('=');
      flag = raw.slice(0, eq);
      value = raw.slice(eq + 1);
    } else if (index + 1 < kwargs.length && !`${kwargs[index + 1]}`.startsWith('-')) {
      value = `${kwargs[index + 1]}`;
      index += 1;
    }

    switch (flag) {
      case '-h':
      case '--help':
      case 'help':
        args.help = true;
        break;

      case '--apply':
        args.apply = parseBoolean(flag, value);
        break;

      case '--dry-run':
      case '--dryRun':
        args.apply = parseBoolean(flag, value) ? false : true;
        break;

      case '--organizationIds':
      case '--organization-ids':
      case '--org':
        args.organizationIds = parseIdList(value);
        break;

      case '--source': {
        const source = (value || 'all').trim().toLowerCase();
        if (source === 'all') {
          args.includePersonalDemographics = true;
          args.includeUserDemographics = true;
        } else if (source === 'personal' || source === 'personaldemographic') {
          args.includePersonalDemographics = true;
          args.includeUserDemographics = false;
        } else if (source === 'user' || source === 'userdemographics') {
          args.includePersonalDemographics = false;
          args.includeUserDemographics = true;
        } else {
          throw new Error(`[--source] expects personal, user or all, received '${value}'`);
        }
        break;
      }

      case '--no-enablement':
      case '--skip-enablement':
        args.includeEnablement = parseBoolean(flag, value) ? false : true;
        break;

      case '--enablement':
        args.includeEnablement = parseBoolean(flag, value);
        break;

      case '--overwrite':
        args.overwrite = parseBoolean(flag, value);
        break;

      case '--max-skip-details': {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw new Error(`[--max-skip-details] expects a whole number >= 0, received '${value}'`);
        }
        args.maxSkipDetails = parsed;
        break;
      }

      case '--report':
        if (!value || value.trim().length === 0) {
          throw new Error('[--report] expects a file path');
        }
        args.reportPath = value.trim();
        break;

      default:
        throw new Error(
          `Unknown argument [${flag}]. Supported: --apply, --dry-run, --organizationIds <ids>, --source <personal|user|all>, --no-enablement, --overwrite, --max-skip-details <n>, --report <path>, -h, --help`,
        );
    }
  }

  return args;
};

/**
 * A no-write target for dry runs. The engine never calls it (it only writes
 * when `apply` is true), so reaching it is a programming error and throws
 * loudly rather than silently discarding data.
 */
const DryRunTarget = {
  writeValues: async (): Promise<any> => {
    throw new Error('DryRunTarget.writeValues must never be called');
  },
  setEnabled: async (): Promise<any> => {
    throw new Error('DryRunTarget.setEnabled must never be called');
  },
};

/** Command implementation. Exported for tests. */
export const LegacyDemographicsMigrationCli = async (
  vargs: string[],
  context: Reactory.Server.IReactoryContext,
): Promise<void> => {
  let args: ILegacyDemographicsMigrationCliArgs;

  try {
    args = parseLegacyDemographicsMigrationArgs(vargs);
  } catch (error: any) {
    context.error(`[ArgumentError] ${error?.message || error}`);
    process.exit(1);
    return;
  }

  if (args.help) {
    // eslint-disable-next-line no-console
    console.log(HelpText);
    process.exit(0);
    return;
  }

  let demographics: any;

  try {
    demographics = context.getService(DEMOGRAPHICS_SERVICE_ID);
  } catch (error: any) {
    context.error(`Failed to load DemographicsService: ${error?.message || error}`);
    process.exit(1);
    return;
  }

  if (!demographics || typeof demographics.saveValues !== 'function' || typeof demographics.setEnabled !== 'function') {
    context.error(
      `DemographicsService [${DEMOGRAPHICS_SERVICE_ID}] is not available or does not support saveValues/setEnabled`,
    );
    process.exit(1);
    return;
  }

  let report: ILegacyMigrationReport;

  try {
    report = await migrateLegacyDemographics(
      createMongoLegacyDemographicsSource(),
      args.apply === true
        ? createDemographicsServiceTarget(demographics, context)
        : DryRunTarget,
      {
        apply: args.apply,
        organizationIds: args.organizationIds,
        includePersonalDemographics: args.includePersonalDemographics,
        includeUserDemographics: args.includeUserDemographics,
        includeEnablement: args.includeEnablement,
        overwrite: args.overwrite,
        maxSkipDetails: args.maxSkipDetails,
      },
    );
  } catch (error: any) {
    context.error(`Legacy demographics migration failed: ${error?.message || error}`);
    process.exit(1);
    return;
  }

  const serialized = JSON.stringify(report, null, 2);

  // eslint-disable-next-line no-console
  console.log(serialized);

  if (args.reportPath) {
    try {
      const target = path.resolve(args.reportPath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `${serialized}\n`, 'utf8');
    } catch (error: any) {
      context.error(`Failed to write the migration report to [${args.reportPath}]: ${error?.message || error}`);
      process.exit(1);
      return;
    }
  }

  // Count failures across *both* write paths. `totals.failed` already unions
  // them, but the enablement changes are checked directly as well so a report
  // produced by an older engine (or a hand-edited fixture) cannot make a
  // failed enablement look successful.
  const enablementFailures = (Array.isArray(report.enablement?.changes) ? report.enablement.changes : [])
    .filter((change) => change?.status === 'write-failed');

  const failedValues = Number(report.totals?.failedValues) || 0;
  const failedEnablement = Math.max(Number(report.totals?.failedEnablement) || 0, enablementFailures.length);
  const totalFailed = Math.max(Number(report.totals?.failed) || 0, failedValues + failedEnablement);

  if (totalFailed > 0) {
    const detail = enablementFailures.length > 0
      ? ` Failed enablement definition(s): ${enablementFailures
        .map((change) => `${change.definitionKey} (${change.organizationId}): ${change.message || 'unknown error'}`)
        .join('; ')}.`
      : '';

    context.error(
      `Legacy demographics migration completed with ${totalFailed} failed write(s) `
      + `(${failedValues} value write(s), ${failedEnablement} enablement write(s)).${detail} See the report for details.`,
    );
    process.exit(1);
  }
};

/**
 * ReactorCliApp definition - same shape as the ORG-030 demographics command so
 * the CLI loader resolves it by stem or by feature action.
 */
const LegacyDemographicsMigrationCliDefinition: Reactory.IReactoryComponentDefinition<any> = {
  nameSpace: 'core',
  name: 'DemographicsLegacyMigration',
  version: '1.0.0',
  description: HelpText,
  component: LegacyDemographicsMigrationCli as any,
  domain: Reactory.ComponentDomain.function,
  features: [
    {
      feature: 'DemographicsLegacyMigration',
      featureType: Reactory.FeatureType.function,
      action: [
        'demographics-legacy-migrate',
        'migrate-legacy-demographics',
        'demographics-migrate',
      ],
      stem: 'demographics-legacy-migrate',
    },
  ],
  overwrite: false,
  roles: [],
  stem: 'demographics-legacy-migrate',
  tags: ['demographics', 'migration', 'legacy', 'backfill', 'org-040', 'core'],
  toString(includeVersion?: boolean) {
    return includeVersion
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : this.name;
  },
};

export default LegacyDemographicsMigrationCliDefinition;
