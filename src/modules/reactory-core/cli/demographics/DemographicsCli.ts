import Reactory from '@reactorynet/reactory-core';

/**
 * ORG-030: `reactory demographics-seed` / `seed-demographics`.
 *
 * A runnable, idempotent backfill for the base demographic template set. It is a
 * thin shell over `DemographicsService.backfillOrganizationDemographics`, which
 * owns the actual behaviour (seed missing definitions only, never overwrite,
 * never resurrect a soft-deleted definition, collect per-tenant failures and
 * carry on). Because that method is idempotent this command is safe to run on
 * every deploy.
 *
 * Usage:
 *   reactory demographics-seed
 *   reactory demographics-seed --organizationIds=<id>[,<id>...]
 *
 * Output is a single JSON object on stdout so the command can be wired into
 * automation:
 *
 *   { "organizations": 3, "created": 30, "existing": 15, "deleted": 0, "failures": [] }
 *
 * Exit codes:
 *   0  the run completed and every organization was seeded (or already seeded)
 *   1  at least one organization failed, the demographics service is not
 *      available, or the arguments could not be parsed. A non-zero exit on
 *      partial failure matters: the backfill deliberately continues past a
 *      failing tenant, so the exit code is the only signal an operator or a
 *      pipeline gets that the run was not complete.
 */

const HelpText = `
Seeds the ORG-030 base demographic template set into existing organizations.

The command is idempotent: definitions that already exist are left untouched
(including renames, reordering and disabled definitions) and definitions an
administrator deleted are NOT re-created.

Parameters:
  --organizationIds <ids>   Comma separated organization ids. When omitted every
                            non-deleted organization is seeded.
  -h --help                 Show this help.

Output (stdout, JSON):
  { organizations, created, existing, deleted, failures }

Exit codes:
  0  complete success
  1  one or more organizations failed, or the command could not run

Examples:
  reactory demographics-seed
  reactory demographics-seed --organizationIds=665f0c1a2b3c4d5e6f708192,665f0c1a2b3c4d5e6f708193
`;

export const DEMOGRAPHICS_SERVICE_ID = 'core.DemographicsService@1.0.0';

/** The subset of the backfill result this command prints. */
export interface IDemographicsSeedCliSummary {
  organizations: number;
  created: number;
  existing: number;
  deleted: number;
  failures: Array<{ organizationId: string; message: string }>;
}

export interface IDemographicsSeedCliArgs {
  organizationIds?: string[];
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

/**
 * Parses `--flag value`, `--flag=value`, `-h` and bare `--help`. Unknown flags
 * are rejected rather than ignored: silently seeding *every* organization
 * because a typo swallowed the id filter would be a genuinely destructive
 * surprise.
 */
export const parseDemographicsSeedArgs = (vargs: string[] = []): IDemographicsSeedCliArgs => {
  const args: IDemographicsSeedCliArgs = { help: false };
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
      case '--organizationIds':
      case '--organization-ids':
      case '--org':
        args.organizationIds = parseIdList(value);
        break;
      default:
        throw new Error(
          `Unknown argument [${flag}]. Supported: --organizationIds <ids>, -h, --help`,
        );
    }
  }

  return args;
};

/**
 * The command itself. Exported for tests; the CLI definition below wraps it in
 * the `IReactoryComponentDefinition` the CLI loader expects.
 */
export const DemographicsSeedCli = async (
  vargs: string[],
  context: Reactory.Server.IReactoryContext,
): Promise<void> => {
  let args: IDemographicsSeedCliArgs;

  try {
    args = parseDemographicsSeedArgs(vargs);
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

  if (!demographics || typeof demographics.backfillOrganizationDemographics !== 'function') {
    context.error(
      `DemographicsService [${DEMOGRAPHICS_SERVICE_ID}] is not available or does not support backfillOrganizationDemographics`,
    );
    process.exit(1);
    return;
  }

  let outcome: any;

  try {
    outcome = await demographics.backfillOrganizationDemographics({
      organizationIds: args.organizationIds,
    });
  } catch (error: any) {
    context.error(`Demographics backfill failed: ${error?.message || error}`);
    process.exit(1);
    return;
  }

  const failures = Array.isArray(outcome?.failures) ? outcome.failures : [];

  // The exact five keys the ticket specifies, in a stable order, always present
  // (so a consumer can destructure without null checks).
  const summary: IDemographicsSeedCliSummary = {
    organizations: Number(outcome?.organizations) || 0,
    created: Number(outcome?.created) || 0,
    existing: Number(outcome?.existing) || 0,
    deleted: Number(outcome?.deleted) || 0,
    failures,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));

  if (failures.length > 0) {
    context.error(
      `Demographics backfill completed with ${failures.length} failed organization(s): ${failures
        .map((failure: any) => `${failure?.organizationId}: ${failure?.message}`)
        .join('; ')}`,
    );
    process.exit(1);
  }
};

/**
 * ReactorCliApp definition - mirrors cli/init/InitializeSystemUser.ts so the
 * command is discoverable through the same stem/action resolution.
 */
const DemographicsCliDefinition: Reactory.IReactoryComponentDefinition<any> = {
  nameSpace: 'core',
  name: 'Demographics',
  version: '1.0.0',
  description: HelpText,
  component: DemographicsSeedCli as any,
  domain: Reactory.ComponentDomain.function,
  features: [
    {
      feature: 'Demographics',
      featureType: Reactory.FeatureType.function,
      action: ['demographics-seed', 'seed-demographics', 'demographics'],
      stem: 'demographics-seed',
    },
  ],
  overwrite: false,
  roles: [],
  stem: 'demographics-seed',
  tags: ['demographics', 'seed', 'backfill', 'org-030', 'core'],
  toString(includeVersion?: boolean) {
    return includeVersion
      ? `${this.nameSpace}.${this.name}@${this.version}`
      : this.name;
  },
};

export default DemographicsCliDefinition;
