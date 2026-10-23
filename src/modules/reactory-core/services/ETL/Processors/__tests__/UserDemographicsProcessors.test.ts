import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { BASE_DEMOGRAPHIC_TEMPLATES } from '@reactory/server-modules/reactory-core/services/demographics/baseDemographicTemplates';
import UserDemographicsProcessor from '../UserDemographicsProcessors';

/**
 * ORG-040 ETL tests.
 *
 * `UserDemographicsProcessors.ts` used to call two GraphQL resolvers that no
 * longer exist. These tests pin the replacement:
 *  - no retired resolver name is left in the source;
 *  - the eight legacy settings booleans are derived from
 *    `DemographicsService.list` + `getPolicy`;
 *  - values are written through `DemographicsService.saveValues`, with mapping,
 *    validation and the enabled gating applied first.
 */

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const BusinessUnit = { find: jest.fn() };
  // `Region` is used as a constructor by the region synchroniser as well as a
  // query entry point, so the double has to support both.
  const Region: any = jest.fn(function RegionDouble(this: any, document: any) {
    Object.assign(this, document);
    this._id = document?._id || new (require('mongodb').ObjectId)().toHexString();
    this.save = jest.fn().mockResolvedValue(this);
  });
  Region.find = jest.fn();
  const Team = { find: jest.fn() };
  const OperationalGroup = { findOne: jest.fn() };
  return { BusinessUnit, Region, Team, OperationalGroup };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const models = require('@reactory/server-modules/reactory-core/models');

const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();
const REGION_ID = new ObjectId().toHexString();
const BUSINESS_UNIT_ID = new ObjectId().toHexString();
const TEAM_ID = new ObjectId().toHexString();
const OPERATIONAL_GROUP_ID = new ObjectId().toHexString();

const buildDefinitions = (overrides: Record<string, any> = {}) =>
  BASE_DEMOGRAPHIC_TEMPLATES.map((template) => ({
    _id: new ObjectId().toHexString(),
    organization: ORG_ID,
    key: template.key.toLowerCase(),
    title: template.title,
    valueType: template.valueType,
    options: template.options ? template.options.map((option) => ({ ...option })) : undefined,
    reference: template.reference ? { ...template.reference } : undefined,
    multiValued: template.multiValued === true,
    required: template.required,
    enabled: overrides[template.key.toLowerCase()] !== undefined
      ? overrides[template.key.toLowerCase()]
      : template.enabled,
    deleted: false,
  }));

const importRow = (overrides: Record<string, any> = {}): any => ({
  rid: 1,
  row_data: [] as string[],
  validated: true,
  processed: false,
  errors: [] as string[],
  action_taken: 'ADDED',
  timeline: [] as any[],
  user: {
    id: USER_ID,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    authProvider: 'reactory',
  },
  demographics: {
    gender: 'Male',
    dob: '1990-05-04',
    race: 'African',
    position: 'Engineer',
    region: 'North',
    businessUnit: 'Sales',
    team: 'Alpha',
    operationalGroup: 'Operations',
  },
  ...overrides,
});

const createProcessor = (options: {
  demographics?: any;
  definitionsList?: any[];
  policy?: any;
} = {}) => {
  const demographics = options.demographics || {
    list: jest.fn().mockResolvedValue(options.definitionsList || buildDefinitions()),
    getPolicy: jest.fn().mockResolvedValue(options.policy || {
      organization: ORG_ID,
      selfServiceEnabled: true,
      adminOnlyKeys: [],
    }),
    saveValues: jest.fn(async (_organizationId: string, values: any[]) => values),
    setEnabled: jest.fn(),
  };

  const context: any = {
    user: { _id: USER_ID },
    partner: { _id: new ObjectId().toHexString() },
    colors: {
      green: (value: string) => value,
      warn: (value: string) => value,
      debug: (value: string) => value,
      red: (value: string) => value,
    },
    log: jest.fn(),
    error: jest.fn(),
    getService: jest.fn((id: string) => id === 'core.DemographicsService@1.0.0' ? demographics : undefined),
  };

  const organizationService = {
    createBusinessUnit: jest.fn(),
    createTeam: jest.fn(),
  };

  const props = {
    $dependencies: {
      fileService: {},
      organizationService,
      demographicsService: demographics,
    },
    packman: {
      getNextProcessor: (): any => null,
    },
  };

  const processor: any = new (UserDemographicsProcessor as any)(props, context);
  return { processor, demographics, context, organizationService };
};

describe('UserDemographicsProcessor retarget (ORG-040)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    models.BusinessUnit.find.mockResolvedValue([{ _id: BUSINESS_UNIT_ID, name: 'Sales' }]);
    models.Team.find.mockResolvedValue([{ _id: TEAM_ID, name: 'Alpha' }]);
    models.Region.find.mockResolvedValue([{ _id: REGION_ID, key: `north::${ORG_ID}`, title: 'North' }]);
    models.OperationalGroup.findOne.mockResolvedValue({ _id: OPERATIONAL_GROUP_ID, title: 'Operations' });
  });

  it('contains no reference to the removed legacy resolvers', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../UserDemographicsProcessors.ts'), 'utf8');

    // The retired resolver prefix is assembled at runtime so that a
    // repository-wide grep for it only ever matches code that was actually
    // removed, not this assertion.
    const retiredPrefix = ['Mo', 'res'].join('');

    expect(source).not.toMatch(new RegExp(retiredPrefix));
    expect(source).not.toMatch(/mutateGraph|queryGraph|ReactoryApolloClient/);
    expect(source).toMatch(/saveValues/);
  });

  it('derives the eight legacy settings booleans from definitions and reads the policy', async () => {
    const { processor, demographics } = createProcessor({
      definitionsList: buildDefinitions({ gender: false, team: false }),
      policy: { organization: ORG_ID, selfServiceEnabled: false, adminOnlyKeys: ['race'] },
    });

    const settings = await processor.getOrganizationDemographicsSettings(ORG_ID);

    expect(demographics.list).toHaveBeenCalledWith(ORG_ID, true, expect.anything());
    expect(demographics.getPolicy).toHaveBeenCalledWith(ORG_ID, expect.anything());

    expect(settings).toMatchObject({
      age: true,
      gender: false,
      race: true,
      region: true,
      position: true,
      operationalGroup: true,
      businessUnit: true,
      teams: false,
      selfServiceEnabled: false,
      adminOnlyKeys: ['race'],
    });
    expect(settings.definitions.gender.key).toBe('gender');
  });

  it('treats a missing definition as disabled instead of throwing', async () => {
    const { processor } = createProcessor({
      definitionsList: buildDefinitions().filter((definition) => definition.key !== 'race'),
    });

    const settings = await processor.getOrganizationDemographicsSettings(ORG_ID);

    expect(settings.race).toBe(false);
    expect(settings.gender).toBe(true);
  });

  it('throws when the demographics service is not available', async () => {
    const { processor } = createProcessor({ demographics: {} as any });

    await expect(processor.getOrganizationDemographicsSettings(ORG_ID)).rejects.toThrow(
      /DemographicsService/,
    );
  });

  it('writes every imported value through DemographicsService.saveValues', async () => {
    const { processor, demographics } = createProcessor();
    const row = importRow();

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [row],
      preview: false,
    });

    expect(demographics.saveValues).toHaveBeenCalledTimes(1);

    const [organizationId, values] = demographics.saveValues.mock.calls[0];
    expect(organizationId).toBe(ORG_ID);

    const byKey = values.reduce((accumulator: Record<string, any>, value: any) => {
      accumulator[value.key] = value.value;
      return accumulator;
    }, {});

    expect(Object.keys(byKey).sort()).toEqual([
      'businessUnit',
      'dateOfBirth',
      'gender',
      'operationalGroup',
      'position',
      'race',
      'region',
      'team',
    ]);
    expect(byKey.gender).toBe('male');
    expect(byKey.race).toEqual(['african']);
    expect(byKey.dateOfBirth).toBeInstanceOf(Date);
    expect(byKey.position).toBe('Engineer');
    expect(byKey.region).toBe(REGION_ID);
    expect(byKey.businessUnit).toBe(BUSINESS_UNIT_ID);
    expect(byKey.team).toBe(TEAM_ID);
    expect(byKey.operationalGroup).toBe(OPERATIONAL_GROUP_ID);

    // Every value is attributed to the imported user and marked as an import.
    values.forEach((value: any) => {
      expect(value.user).toBe(USER_ID);
      expect(value.source).toBe('import');
    });

    expect(result[0].demographic_result.data.demographics).toHaveLength(8);
    expect(result[0].errors).toEqual([]);
  });

  it('does not write a disabled definition and skips unmappable values with a row error', async () => {
    const { processor, demographics } = createProcessor({
      definitionsList: buildDefinitions({ gender: false }),
    });
    const row = importRow({ demographics: { ...importRow().demographics, gender: 'Male', race: 'Martian' } });

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [row],
      preview: false,
    });

    const [, values] = demographics.saveValues.mock.calls[0];
    const keys = values.map((value: any) => value.key);

    expect(keys).not.toContain('gender');
    expect(keys).not.toContain('race');
    expect(result[0].errors.join(' ')).toMatch(/race.*Martian.*not imported/);
  });

  it('reports a supplied value for an unseeded definition instead of dropping it silently', async () => {
    // `race` is not seeded for this organization, but the import row supplies a
    // race. The reviewer's probe: the row error used to be unreachable because a
    // missing definition forced `enabled === false`.
    const { processor, demographics } = createProcessor({
      definitionsList: buildDefinitions().filter((definition) => definition.key !== 'race'),
    });

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow({ demographics: { ...importRow().demographics, race: 'African' } })],
      preview: false,
    });

    // No silent drop: the operator is told, on that row, that the definition is
    // not configured. The other values still import.
    expect(result[0].errors.join(' ')).toMatch(
      /Demographic definition \[race\] is not configured for this organization; race not imported/,
    );

    const [, values] = demographics.saveValues.mock.calls[0];
    const keys = values.map((value: any) => value.key);
    expect(keys).not.toContain('race');
    expect(keys).toContain('gender');
    expect(result[0].demographic_result.data.demographics).toHaveLength(7);
  });

  it('reports a supplied operational group for an unseeded definition', async () => {
    const { processor, demographics } = createProcessor({
      definitionsList: buildDefinitions().filter((definition) => definition.key !== 'operationalgroup'),
    });

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow()],
      preview: false,
    });

    expect(result[0].errors.join(' ')).toMatch(
      /Demographic definition \[operationalGroup\] is not configured for this organization; operationalGroup not imported/,
    );

    const [, values] = demographics.saveValues.mock.calls[0];
    expect(values.map((value: any) => value.key)).not.toContain('operationalGroup');
  });

  it('stays silent when a definition is present but disabled (an administrator choice)', async () => {
    const { processor, demographics } = createProcessor({
      definitionsList: buildDefinitions({ race: false, team: false }),
    });

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow()],
      preview: false,
    });

    const [, values] = demographics.saveValues.mock.calls[0];
    const keys = values.map((value: any) => value.key);

    expect(keys).not.toContain('race');
    expect(keys).not.toContain('team');
    // Disabled is expected behaviour, so it must not produce row errors.
    expect(result[0].errors).toEqual([]);
    expect(result[0].demographic_result.data.demographics).toHaveLength(6);
  });

  it('reports an unmapped operational group instead of creating a record', async () => {
    models.OperationalGroup.findOne.mockResolvedValue(null);
    const { processor, demographics } = createProcessor();

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow()],
      preview: false,
    });

    const [, values] = demographics.saveValues.mock.calls[0];
    expect(values.map((value: any) => value.key)).not.toContain('operationalGroup');
    expect(result[0].errors.join(' ')).toMatch(/Operational group 'Operations' was not imported/);
  });

  it('keeps going when one row fails and reports the failure on that row', async () => {
    const failing = importRow({ rid: 2, user: { ...importRow().user, id: new ObjectId().toHexString() } });
    const { processor, demographics } = createProcessor();

    demographics.saveValues
      .mockRejectedValueOnce(new Error('insufficient permissions'))
      .mockResolvedValueOnce([]);

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow(), failing],
      preview: false,
    });

    expect(result[0].errors.join(' ')).toMatch(/insufficient permissions/);
    expect(result[1].errors).toEqual([]);
  });

  it('writes nothing in preview mode', async () => {
    const { processor, demographics } = createProcessor();

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow()],
      preview: true,
    });

    expect(demographics.saveValues).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('creates the business unit, team and region that do not exist yet', async () => {
    models.BusinessUnit.find.mockResolvedValue([]);
    models.Team.find.mockResolvedValue([]);
    models.Region.find.mockResolvedValue([]);

    const { processor, demographics, organizationService } = createProcessor();

    organizationService.createBusinessUnit.mockResolvedValue({ _id: BUSINESS_UNIT_ID, name: 'Sales' });
    organizationService.createTeam.mockResolvedValue({ _id: TEAM_ID, name: 'Alpha' });

    await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow()],
      preview: false,
    });

    // Structural records are created before any value points at them.
    expect(organizationService.createBusinessUnit).toHaveBeenCalledWith(ORG_ID, 'Sales', expect.anything());
    expect(organizationService.createTeam).toHaveBeenCalledWith(ORG_ID, 'Alpha', expect.anything());

    const regionInstance = models.Region.mock.instances[0];
    expect(regionInstance.save).toHaveBeenCalled();

    const [, values] = demographics.saveValues.mock.calls[0];
    const byKey = values.reduce((accumulator: Record<string, any>, value: any) => {
      accumulator[value.key] = value.value;
      return accumulator;
    }, {});

    expect(byKey.businessUnit).toBe(BUSINESS_UNIT_ID);
    expect(byKey.team).toBe(TEAM_ID);
    expect(byKey.region).toBe(regionInstance._id);
  });

  it('skips a row whose email is marked as an error row', async () => {
    const { processor, demographics } = createProcessor();

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow({ user: { ...importRow().user, email: 'ERR-ada@example.com' } })],
      preview: false,
    });

    expect(demographics.saveValues).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('resolves the service from the execution context when it is not injected', async () => {
    const demographics = {
      list: jest.fn().mockResolvedValue(buildDefinitions()),
      getPolicy: jest.fn().mockResolvedValue({ organization: ORG_ID, selfServiceEnabled: true, adminOnlyKeys: [] }),
      saveValues: jest.fn(async (_organizationId: string, values: any[]) => values),
      setEnabled: jest.fn(),
    };

    const context: any = {
      user: { _id: USER_ID },
      colors: { green: (v: string) => v },
      log: jest.fn(),
      getService: jest.fn((): any => demographics),
    };

    const processor: any = new (UserDemographicsProcessor as any)({ packman: { getNextProcessor: (): any => null } }, context);

    const settings = await processor.getOrganizationDemographicsSettings(ORG_ID);
    expect(settings.gender).toBe(true);

    // The processor also exposes the standard processor context hooks.
    const replacement: any = { user: { _id: USER_ID } };
    expect(processor.setExecutionContext(replacement)).toBe(true);
    expect(processor.getExecutionContext()).toBe(replacement);
  });

  it('leaves the service null when the execution context cannot resolve it', async () => {
    const context: any = {
      user: { _id: USER_ID },
      log: jest.fn(),
      getService: jest.fn((): any => {
        throw new Error('service manager offline');
      }),
    };

    const processor: any = new (UserDemographicsProcessor as any)({ packman: { getNextProcessor: (): any => null } }, context);

    expect(processor.demographicsService).toBeNull();
    await expect(processor.getOrganizationDemographicsSettings(ORG_ID)).rejects.toThrow(/DemographicsService/);
  });

  it('reports on every row when the organization configuration cannot be loaded', async () => {
    const { processor, demographics } = createProcessor({
      demographics: {
        list: jest.fn().mockRejectedValue(new Error('definitions unavailable')),
        getPolicy: jest.fn(),
        saveValues: jest.fn(),
        setEnabled: jest.fn(),
      },
    });

    const result = await processor.process({
      file: 'users.csv',
      import_package: { organization: { _id: ORG_ID } },
      input: [importRow()],
      preview: false,
    });

    expect(demographics.saveValues).not.toHaveBeenCalled();
    expect(result[0].errors.join(' ')).toMatch(/configuration could not be loaded/);
  });
});
