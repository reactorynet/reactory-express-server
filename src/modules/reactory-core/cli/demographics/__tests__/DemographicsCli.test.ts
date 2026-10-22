import DemographicsCliDefinition, {
  DemographicsSeedCli,
  parseDemographicsSeedArgs,
  DEMOGRAPHICS_SERVICE_ID,
} from '../DemographicsCli';

/**
 * ORG-030 / reviewer F3: the backfill must be runnable, not just callable from
 * code. These tests exercise the CLI plugin the way the CLI loader does - through
 * `definition.component(args, context)` - and assert the three things the ticket
 * promises an operator: the JSON summary shape, the `--organizationIds` filter,
 * and a non-zero exit when any organization fails.
 *
 * `process.exit` is stubbed to throw so a failing exit is observable without
 * killing jest.
 */
describe('Demographics CLI backfill command (ORG-030)', () => {
  let context: any;
  let backfillOrganizationDemographics: jest.Mock;
  let exitSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  let stdoutSpy: jest.SpyInstance;

  const run = (args: string[]) =>
    DemographicsCliDefinition.component(args as any, context);

  beforeEach(() => {
    jest.clearAllMocks();

    backfillOrganizationDemographics = jest.fn().mockResolvedValue({
      organizations: 2,
      created: 15,
      existing: 15,
      deleted: 0,
      failures: [],
      results: [],
    });

    context = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      getService: jest.fn((id: string) =>
        id === DEMOGRAPHICS_SERVICE_ID ? { backfillOrganizationDemographics } : undefined),
    };

    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as any);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    stdoutSpy = logSpy;
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Registration / definition
  // ---------------------------------------------------------------------------

  it('is a registered reactory-core CLI plugin with a resolvable stem', () => {
    expect(DemographicsCliDefinition.nameSpace).toBe('core');
    expect(DemographicsCliDefinition.name).toBe('Demographics');
    expect(DemographicsCliDefinition.version).toBe('1.0.0');
    expect(DemographicsCliDefinition.stem).toBe('demographics-seed');
    expect(DemographicsCliDefinition.features?.[0].action).toEqual(
      expect.arrayContaining(['demographics-seed', 'seed-demographics']),
    );
    expect(typeof DemographicsCliDefinition.component).toBe('function');
  });

  it('is exported from the reactory-core cli index', () => {
    // The cli index only re-exports CLI definitions - it must not be confused
    // with the module index, which loads the whole server graph.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const clis: any[] = require('../../index').default;
    expect(clis).toEqual(expect.arrayContaining([
      expect.objectContaining({ nameSpace: 'core', name: 'Demographics' }),
    ]));
  });

  // ---------------------------------------------------------------------------
  // Argument parsing
  // ---------------------------------------------------------------------------

  it('parses --organizationIds as either space or equals separated, de-duplicated', () => {
    const ids = ['665f0c1a2b3c4d5e6f708192', '665f0c1a2b3c4d5e6f708193'];

    expect(parseDemographicsSeedArgs([])).toEqual({ help: false });
    expect(parseDemographicsSeedArgs([`--organizationIds=${ids.join(',')}`]).organizationIds).toEqual(ids);
    expect(parseDemographicsSeedArgs(['--organizationIds', ids.join(',')]).organizationIds).toEqual(ids);
    expect(parseDemographicsSeedArgs(['--organization-ids', ids[0]]).organizationIds).toEqual([ids[0]]);
    expect(parseDemographicsSeedArgs(['--organizationIds', `${ids[0]}, ${ids[0]},,`]).organizationIds)
      .toEqual([ids[0]]);
  });

  it('rejects an unknown flag instead of silently seeding every organization', async () => {
    await expect(run(['--organizationId', '665f0c1a2b3c4d5e6f708192'])).rejects.toThrow('process.exit:1');

    expect(context.error).toHaveBeenCalledWith(expect.stringMatching(/\[ArgumentError\] Unknown argument/));
    expect(backfillOrganizationDemographics).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it('backfills every organization and prints the documented JSON summary', async () => {
    await run([]);

    expect(context.getService).toHaveBeenCalledWith(DEMOGRAPHICS_SERVICE_ID);
    expect(backfillOrganizationDemographics).toHaveBeenCalledWith({ organizationIds: undefined });

    const printed = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(printed).toEqual({
      organizations: 2,
      created: 15,
      existing: 15,
      deleted: 0,
      failures: [],
    });
    expect(Object.keys(printed)).toEqual(['organizations', 'created', 'existing', 'deleted', 'failures']);

    // Success must NOT exit non-zero.
    expect(exitSpy).not.toHaveBeenCalled();
    expect(context.error).not.toHaveBeenCalled();
  });

  it('passes the --organizationIds filter straight through', async () => {
    const ids = ['665f0c1a2b3c4d5e6f708192', '665f0c1a2b3c4d5e6f708193'];

    await run([`--organizationIds=${ids.join(',')}`]);

    expect(backfillOrganizationDemographics).toHaveBeenCalledWith({ organizationIds: ids });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('reports deleted definitions without failing the run', async () => {
    backfillOrganizationDemographics.mockResolvedValue({
      organizations: 1, created: 0, existing: 14, deleted: 1, failures: [], results: [],
    });

    await run([]);

    const printed = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(printed.deleted).toBe(1);
    expect(printed.failures).toEqual([]);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('is idempotent from the operator\'s point of view: a re-run reports everything as existing', async () => {
    await run([]);
    backfillOrganizationDemographics.mockResolvedValue({
      organizations: 2, created: 0, existing: 30, deleted: 0, failures: [], results: [],
    });
    await run([]);

    const second = JSON.parse(stdoutSpy.mock.calls[1][0]);
    expect(second.created).toBe(0);
    expect(second.existing).toBe(30);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Failure paths
  // ---------------------------------------------------------------------------

  it('prints the failures and exits non-zero when an organization fails', async () => {
    backfillOrganizationDemographics.mockResolvedValue({
      organizations: 2,
      created: 15,
      existing: 0,
      deleted: 0,
      failures: [{ organizationId: '665f0c1a2b3c4d5e6f708192', message: 'simulated write failure' }],
      results: [],
    });

    await expect(run([])).rejects.toThrow('process.exit:1');

    const printed = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(printed.failures).toHaveLength(1);
    expect(printed.failures[0].organizationId).toBe('665f0c1a2b3c4d5e6f708192');
    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/completed with 1 failed organization\(s\): 665f0c1a2b3c4d5e6f708192: simulated write failure/),
    );
  });

  it('exits non-zero when the demographics service is not registered', async () => {
    context.getService.mockReturnValue(undefined);

    await expect(run([])).rejects.toThrow('process.exit:1');

    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/DemographicsService \[core\.DemographicsService@1\.0\.0\] is not available/),
    );
    expect(backfillOrganizationDemographics).not.toHaveBeenCalled();
  });

  it('exits non-zero when resolving the service throws', async () => {
    context.getService.mockImplementation(() => {
      throw new Error('service manager offline');
    });

    await expect(run([])).rejects.toThrow('process.exit:1');

    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/Failed to load DemographicsService: service manager offline/),
    );
  });

  it('exits non-zero when the backfill itself throws', async () => {
    backfillOrganizationDemographics.mockRejectedValue(new Error('database unreachable'));

    await expect(run([])).rejects.toThrow('process.exit:1');

    expect(context.error).toHaveBeenCalledWith(
      expect.stringMatching(/Demographics backfill failed: database unreachable/),
    );
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('prints help and exits 0 for --help without touching the service', async () => {
    await expect(run(['--help'])).rejects.toThrow('process.exit:0');

    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringMatching(/--organizationIds/));
    expect(context.getService).not.toHaveBeenCalled();
  });

  it('defaults missing counters to zero rather than printing undefined', async () => {
    backfillOrganizationDemographics.mockResolvedValue({});

    await run([]);

    expect(JSON.parse(stdoutSpy.mock.calls[0][0])).toEqual({
      organizations: 0, created: 0, existing: 0, deleted: 0, failures: [],
    });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('is directly importable as a function (the component the CLI loader calls)', () => {
    expect(DemographicsSeedCli).toBe(DemographicsCliDefinition.component);
  });
});
