import fs from 'fs';
import os from 'os';
import path from 'path';
import { ObjectId } from 'mongodb';
import { BASE_DEMOGRAPHIC_TEMPLATES } from '@reactory/server-modules/reactory-core/services/demographics/baseDemographicTemplates';

/**
 * ORG-040 CLI tests.
 *
 * The command is exercised through its `IReactoryComponentDefinition` the way
 * the CLI loader does (`definition.component(args, context)`), with the real
 * migration engine behind it and only the Mongo source/service target replaced.
 * That asserts the operator contract: dry run by default, `--apply` writes, the
 * JSON report is the documented shape, and bad arguments fail loudly.
 */

const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();
const CLIENT_ID = new ObjectId().toHexString();
const REGION_ID = new ObjectId().toHexString();
const BUSINESS_UNIT_ID = new ObjectId().toHexString();
const TEAM_ID = new ObjectId().toHexString();
const OPERATIONAL_GROUP_ID = new ObjectId().toHexString();

const mockState: {
  rows: Map<string, any>;
  definitions: any[];
  saveValues: jest.Mock;
  setEnabled: jest.Mock;
  source: any;
} = {
  rows: new Map(),
  definitions: [],
  saveValues: jest.fn(),
  setEnabled: jest.fn(),
  source: null,
};

const buildDefinitions = (): any[] => BASE_DEMOGRAPHIC_TEMPLATES.map((template) => ({
  _id: new ObjectId().toHexString(),
  organization: ORG_ID,
  key: template.key.toLowerCase(),
  title: template.title,
  valueType: template.valueType,
  options: template.options ? template.options.map((option) => ({ ...option })) : undefined,
  reference: template.reference ? { ...template.reference } : undefined,
  multiValued: template.multiValued === true,
  required: template.required,
  enabled: template.enabled,
  deleted: false,
}));

jest.mock(
  '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicsMongoSource',
  () => ({
    createMongoLegacyDemographicsSource: () => mockState.source,
    createDemographicsServiceTarget: (service: any, context: any) => ({
      writeValues: (organizationId: string, values: any[]) =>
        service.saveValues(organizationId, values, context),
      setEnabled: (organizationId: string, key: string, enabled: boolean) =>
        service.setEnabled(organizationId, key, enabled, context),
    }),
  }),
);

// eslint-disable-next-line import/first
import LegacyDemographicsMigrationCliDefinition, {
  LegacyDemographicsMigrationCli,
  parseLegacyDemographicsMigrationArgs,
} from '../LegacyDemographicsMigrationCli';
// eslint-disable-next-line import/first
import { DEMOGRAPHICS_SERVICE_ID } from '../DemographicsCli';

describe('Legacy demographics migration CLI (ORG-040)', () => {
  let context: any;
  let exitSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const run = (args: string[] = []) =>
    LegacyDemographicsMigrationCliDefinition.component(args as any, context);

  const printedReport = () => JSON.parse(logSpy.mock.calls[0][0]);

  beforeEach(() => {
    jest.clearAllMocks();
    mockState.rows = new Map();
    mockState.definitions = buildDefinitions();

    mockState.saveValues = jest.fn(async (organizationId: string, values: any[]) => {
      values.forEach((value) => {
        mockState.rows.set(`${organizationId}::${value.user}::${`${value.key}`.toLowerCase()}`, {
          organization: organizationId,
          user: value.user,
          key: `${value.key}`.toLowerCase(),
          value: value.value,
        });
      });
      return values;
    });

    mockState.setEnabled = jest.fn(async (organizationId: string, key: string, enabled: boolean) => {
      const definition = mockState.definitions.find(
        (candidate) => candidate.organization === organizationId && candidate.key === `${key}`.toLowerCase(),
      );
      if (definition) definition.enabled = enabled;
      return definition;
    });

    mockState.source = {
      listPersonalDemographics: async () => [{
        _id: new ObjectId().toHexString(),
        userId: USER_ID,
        race: 'African',
        dob: '1990-05-04',
        gender: 'Male',
        pronoun: 'He / Him',
        position: 'Engineer',
        region: REGION_ID,
        operationalGroup: OPERATIONAL_GROUP_ID,
        businessUnit: BUSINESS_UNIT_ID,
        team: TEAM_ID,
      }],
      listUserDemographics: async (): Promise<any[]> => [],
      listOrganizationSettings: async (): Promise<any[]> => [{
        _id: new ObjectId().toHexString(),
        organization: ORG_ID,
        age: true,
        gender: true,
        race: true,
        region: true,
        position: true,
        operationalGroup: true,
        businessUnit: true,
        teams: true,
        deleted: false,
      }],
      listUserMemberships: async (userIds: string[]): Promise<any[]> => userIds.indexOf(USER_ID) >= 0
        ? [{
          userId: USER_ID,
          memberships: [{
            _id: new ObjectId().toHexString(),
            clientId: CLIENT_ID,
            organizationId: ORG_ID,
            businessUnitId: null,
            roles: ['USER'],
            enabled: true,
          }],
        }]
        : [],
      listDefinitions: async (organizationIds: string[]) =>
        mockState.definitions.filter((definition) => organizationIds.indexOf(definition.organization) >= 0),
      listExistingValues: async (organizationIds: string[], userIds: string[]) =>
        Array.from(mockState.rows.values()).filter((row) =>
          organizationIds.indexOf(`${row.organization}`) >= 0 && userIds.indexOf(`${row.user}`) >= 0),
      listLegacyDemographicReferences: async (): Promise<any[]> => [],
      findOperationalGroupByTitle: async (): Promise<any | null> => null,
      referenceExists: async (model: string, id: string): Promise<boolean> =>
        [`Region::${REGION_ID}`, `BusinessUnit::${BUSINESS_UNIT_ID}`, `Team::${TEAM_ID}`, `OperationalGroup::${OPERATIONAL_GROUP_ID}`]
          .indexOf(`${model}::${id}`) >= 0,
    };

    context = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      getService: jest.fn((id: string) => id === DEMOGRAPHICS_SERVICE_ID
        ? { saveValues: mockState.saveValues, setEnabled: mockState.setEnabled }
        : undefined),
    };

    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as any);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  it('is registered in the reactory-core cli index with its own stem', () => {
    expect(LegacyDemographicsMigrationCliDefinition).toMatchObject({
      nameSpace: 'core',
      name: 'DemographicsLegacyMigration',
      version: '1.0.0',
      stem: 'demographics-legacy-migrate',
    });
    expect(LegacyDemographicsMigrationCliDefinition.features?.[0].action).toEqual(
      expect.arrayContaining(['demographics-legacy-migrate', 'migrate-legacy-demographics']),
    );
    expect(LegacyDemographicsMigrationCliDefinition.component).toBe(LegacyDemographicsMigrationCli);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clis: any[] = require('../../index').default;
    expect(clis).toEqual(expect.arrayContaining([
      expect.objectContaining({ nameSpace: 'core', name: 'DemographicsLegacyMigration' }),
      // The ORG-030 command keeps its own stem and action.
      expect.objectContaining({ nameSpace: 'core', name: 'Demographics', stem: 'demographics-seed' }),
    ]));
  });

  // ---------------------------------------------------------------------------
  // Argument parsing
  // ---------------------------------------------------------------------------

  it('defaults to a dry run', () => {
    expect(parseLegacyDemographicsMigrationArgs([])).toEqual({
      apply: false,
      includePersonalDemographics: true,
      includeUserDemographics: true,
      includeEnablement: true,
      overwrite: false,
      help: false,
    });
  });

  it('parses the documented flags', () => {
    expect(parseLegacyDemographicsMigrationArgs(['--apply', '--overwrite'])).toMatchObject({
      apply: true,
      overwrite: true,
    });
    expect(parseLegacyDemographicsMigrationArgs([`--organizationIds=${ORG_ID}, ${ORG_ID},`]).organizationIds)
      .toEqual([ORG_ID]);
    expect(parseLegacyDemographicsMigrationArgs(['--source', 'personal'])).toMatchObject({
      includePersonalDemographics: true,
      includeUserDemographics: false,
    });
    expect(parseLegacyDemographicsMigrationArgs(['--source=user'])).toMatchObject({
      includePersonalDemographics: false,
      includeUserDemographics: true,
    });
    expect(parseLegacyDemographicsMigrationArgs(['--no-enablement']).includeEnablement).toBe(false);
    expect(parseLegacyDemographicsMigrationArgs(['--max-skip-details', '5']).maxSkipDetails).toBe(5);
    expect(parseLegacyDemographicsMigrationArgs(['--report', '/tmp/x.json']).reportPath).toBe('/tmp/x.json');
  });

  it('honours explicit boolean values on the write and source flags', () => {
    expect(parseLegacyDemographicsMigrationArgs(['--apply=false']).apply).toBe(false);
    expect(parseLegacyDemographicsMigrationArgs(['--apply=yes']).apply).toBe(true);
    expect(parseLegacyDemographicsMigrationArgs(['--apply=0']).apply).toBe(false);
    expect(parseLegacyDemographicsMigrationArgs(['--dry-run=false']).apply).toBe(true);
    expect(parseLegacyDemographicsMigrationArgs(['--dryRun']).apply).toBe(false);
    expect(parseLegacyDemographicsMigrationArgs(['--overwrite=false']).overwrite).toBe(false);
    expect(parseLegacyDemographicsMigrationArgs(['--enablement=false']).includeEnablement).toBe(false);
    expect(parseLegacyDemographicsMigrationArgs(['--no-enablement=false']).includeEnablement).toBe(true);
    expect(parseLegacyDemographicsMigrationArgs(['--skip-enablement']).includeEnablement).toBe(false);
    expect(parseLegacyDemographicsMigrationArgs(['--source=all'])).toMatchObject({
      includePersonalDemographics: true,
      includeUserDemographics: true,
    });
    expect(parseLegacyDemographicsMigrationArgs(['--source=userdemographics'])).toMatchObject({
      includePersonalDemographics: false,
      includeUserDemographics: true,
    });
  });

  it('rejects an unparseable boolean value', async () => {
    await expect(run(['--apply=maybe'])).rejects.toThrow('process.exit:1');

    expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/expects true or false/));
    expect(mockState.saveValues).not.toHaveBeenCalled();
  });

  it('rejects an invalid --max-skip-details value', async () => {
    await expect(run(['--max-skip-details=-1'])).rejects.toThrow('process.exit:1');
    expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/max-skip-details/));
  });

  it('rejects --report without a path', async () => {
    await expect(run(['--report='])).rejects.toThrow('process.exit:1');
    expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/--report.*file path/));
  });

  it('rejects an unknown flag and exits non-zero', async () => {
    await expect(run(['--organisationIds', ORG_ID])).rejects.toThrow('process.exit:1');

    expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/\[ArgumentError\] Unknown argument/));
    expect(mockState.saveValues).not.toHaveBeenCalled();
  });

  it('rejects --source with an unknown value', async () => {
    await expect(run(['--source=everything'])).rejects.toThrow('process.exit:1');
    expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/--source/));
  });

  // ---------------------------------------------------------------------------
  // Dry run / apply
  // ---------------------------------------------------------------------------

  it('writes nothing by default and prints the report', async () => {
    await run([]);

    expect(mockState.saveValues).not.toHaveBeenCalled();
    expect(mockState.setEnabled).not.toHaveBeenCalled();
    expect(mockState.rows.size).toBe(0);

    const report = printedReport();
    expect(report.dryRun).toBe(true);
    expect(report.totals.written).toBe(9);
    expect(report.definitions.map((definition: any) => definition.key)).toEqual(
      expect.arrayContaining(['race', 'dateofbirth', 'gender', 'pronoun', 'position', 'region', 'operationalgroup', 'businessunit', 'team']),
    );
    expect(report.enablement.changed).toBe(0);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('writes through DemographicsService when --apply is passed and is idempotent', async () => {
    await run(['--apply']);

    expect(context.getService).toHaveBeenCalledWith(DEMOGRAPHICS_SERVICE_ID);
    expect(mockState.saveValues).toHaveBeenCalledTimes(1);
    expect(mockState.rows.size).toBe(9);

    const first = printedReport();
    expect(first.dryRun).toBe(false);
    expect(first.totals.written).toBe(9);

    logSpy.mockClear();
    await run(['--apply']);

    const second = printedReport();
    expect(second.totals.written).toBe(0);
    expect(second.totals.skipped).toBe(9);
    expect(mockState.rows.size).toBe(9);
  });

  it('passes the --organizationIds filter to the run', async () => {
    await run([`--organizationIds=${new ObjectId().toHexString()}`]);

    const report = printedReport();
    expect(report.organizationIds).toHaveLength(1);
    expect(report.totals.written).toBe(0);
  });

  it('honours --source=personal by not reading UserDemographics', async () => {
    const spy = jest.spyOn(mockState.source, 'listUserDemographics');
    await run(['--source=personal']);

    expect(spy).not.toHaveBeenCalled();
    expect(printedReport().sources.userDemographics).toBe(0);
  });

  it('honours --no-enablement', async () => {
    await run(['--apply', '--no-enablement']);

    expect(mockState.setEnabled).not.toHaveBeenCalled();
    expect(printedReport().enablement.considered).toBe(0);
  });

  it('writes the report to --report as well as stdout', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'org-040-'));
    const reportPath = path.join(directory, 'nested', 'report.json');

    await run([`--report=${reportPath}`]);

    expect(fs.existsSync(reportPath)).toBe(true);
    const fromFile = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(fromFile.dryRun).toBe(true);
    expect(fromFile.totals.written).toBe(9);

    (fs as any).rmSync(directory, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Failure paths
  // ---------------------------------------------------------------------------

  it('exits non-zero when the demographics service is unavailable', async () => {
    context.getService.mockReturnValue(undefined);

    await expect(run([])).rejects.toThrow('process.exit:1');
    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/DemographicsService \[core\.DemographicsService@1\.0\.0\] is not available/),
    );
  });

  it('exits non-zero when a definition enablement write fails (end to end)', async () => {
    // One definition is disabled while the legacy settings sheet says it is
    // collected, so the run has exactly one enablement write to apply.
    mockState.definitions = mockState.definitions.map((definition) =>
      definition.key === 'race' ? { ...definition, enabled: false } : definition);
    mockState.setEnabled.mockRejectedValue(new Error('enablement rejected'));

    await expect(run(['--apply'])).rejects.toThrow('process.exit:1');

    const report = printedReport();

    // The report must name the failure and separate it from value writes.
    expect(report.enablement.failed).toBe(1);
    expect(report.enablement.skipped).toBe(0);
    expect(report.enablement.changes.find((change: any) => change.definitionKey === 'race')).toMatchObject({
      status: 'write-failed',
      changed: false,
      message: 'enablement rejected',
    });
    expect(report.totals.failedEnablement).toBe(1);
    expect(report.totals.failedValues).toBe(0);
    expect(report.totals.failed).toBe(1);

    // Value writes still succeeded; the run is failed only by the enablement.
    expect(report.totals.written).toBe(9);
    expect(mockState.rows.size).toBe(9);

    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/1 failed write\(s\) \(0 value write\(s\), 1 enablement write\(s\)\)/),
    );
    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/Failed enablement definition\(s\): race \(.*\): enablement rejected/),
    );
  });

  it('exits non-zero when a write fails', async () => {
    mockState.saveValues.mockRejectedValue(new Error('write rejected'));

    await expect(run(['--apply'])).rejects.toThrow('process.exit:1');

    const report = printedReport();
    expect(report.totals.failed).toBe(9);
    expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/9 failed write\(s\)/));
  });

  it('exits non-zero when loading the service throws', async () => {
    context.getService.mockImplementation(() => {
      throw new Error('service manager offline');
    });

    await expect(run([])).rejects.toThrow('process.exit:1');
    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/Failed to load DemographicsService: service manager offline/),
    );
  });

  it('exits non-zero when the migration throws', async () => {
    mockState.source.listPersonalDemographics = jest.fn().mockRejectedValue(new Error('database unreachable'));

    await expect(run([])).rejects.toThrow('process.exit:1');

    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/Legacy demographics migration failed: database unreachable/),
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('exits non-zero when the report file cannot be written', async () => {
    // `/dev/null` is a file, so creating a directory beneath it must fail.
    await expect(run(['--report=/dev/null/report.json'])).rejects.toThrow('process.exit:1');

    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/Failed to write the migration report/),
    );
    // The report is still printed, so the operator keeps the evidence.
    expect(printedReport().dryRun).toBe(true);
  });

  it('prints help and exits 0 without resolving the service', async () => {
    await expect(run(['--help'])).rejects.toThrow('process.exit:0');

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/DRY RUN BY DEFAULT/));
    expect(context.getService).not.toHaveBeenCalled();
  });

  it('is directly importable as the command function', () => {
    expect(LegacyDemographicsMigrationCli).toBe(LegacyDemographicsMigrationCliDefinition.component);
    expect(LegacyDemographicsMigrationCliDefinition.toString(true)).toBe('core.DemographicsLegacyMigration@1.0.0');
    expect(LegacyDemographicsMigrationCliDefinition.toString()).toBe('DemographicsLegacyMigration');
  });
});
