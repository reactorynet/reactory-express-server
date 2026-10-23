import { ObjectId } from 'mongodb';

/**
 * ORG-040: `legacyDemographicsMongoSource` tests.
 *
 * This is the only module that touches the real collections, and it is the only
 * implementation of the ticket's "legacy collections stay read-only" rule. The
 * models are mocked, so the suite can assert two things the engine suites cannot:
 *  - each read method issues the query the engine's semantics depend on
 *    (soft-deleted settings excluded, definitions *including* deleted ones,
 *    membership projection, id validity filters, escaped title regex, model
 *    existence checks);
 *  - **no legacy model is ever written to**. Every model double carries write
 *    spies (`create`, `save`, `updateOne`, `deleteOne`, ...) and the suite
 *    asserts they stay untouched after every read path has run.
 */

jest.mock(
  '@reactory/server-modules/reactory-core/models/PersonalDemographic',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/UserDemographics',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/User',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/BusinessUnit',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/OperationalGroup',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/Organization',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/Region',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/Team',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/demographics/Demographic',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/demographics/DemographicDefinition',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/demographics/DemographicValue',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);
jest.mock(
  '@reactory/server-modules/reactory-core/models/demographics/OrganizationDemographicsSettings',
  () => ({ __esModule: true, default: require('./support/modelMock').createModelMock() }),
);

/* eslint-disable import/first */
import PersonalDemographic from '@reactory/server-modules/reactory-core/models/PersonalDemographic';
import UserDemographics from '@reactory/server-modules/reactory-core/models/UserDemographics';
import User from '@reactory/server-modules/reactory-core/models/User';
import BusinessUnit from '@reactory/server-modules/reactory-core/models/BusinessUnit';
import OperationalGroup from '@reactory/server-modules/reactory-core/models/OperationalGroup';
import Organization from '@reactory/server-modules/reactory-core/models/Organization';
import Region from '@reactory/server-modules/reactory-core/models/Region';
import Team from '@reactory/server-modules/reactory-core/models/Team';
import Demographic from '@reactory/server-modules/reactory-core/models/demographics/Demographic';
import DemographicDefinition from '@reactory/server-modules/reactory-core/models/demographics/DemographicDefinition';
import DemographicValue from '@reactory/server-modules/reactory-core/models/demographics/DemographicValue';
import OrganizationDemographicsSettings from '@reactory/server-modules/reactory-core/models/demographics/OrganizationDemographicsSettings';
import {
  createDemographicsServiceTarget,
  createMongoLegacyDemographicsSource,
} from '../legacyDemographicsMongoSource';
import { createQueryChain, WRITE_METHODS } from './support/modelMock';
/* eslint-enable import/first */

const asMock = (value: any) => value as any;

const ORG_ID = new ObjectId().toHexString();
const USER_ID = new ObjectId().toHexString();
const REGION_ID = new ObjectId().toHexString();

const ALL_MODELS: Array<[string, any]> = [
  ['PersonalDemographic', PersonalDemographic],
  ['UserDemographics', UserDemographics],
  ['User', User],
  ['BusinessUnit', BusinessUnit],
  ['OperationalGroup', OperationalGroup],
  ['Organization', Organization],
  ['Region', Region],
  ['Team', Team],
  ['Demographic', Demographic],
  ['DemographicDefinition', DemographicDefinition],
  ['DemographicValue', DemographicValue],
  ['OrganizationDemographicsSettings', OrganizationDemographicsSettings],
];

/** Asserts that nothing in the adapter wrote to any legacy/new model. */
const expectNoWrites = () => {
  ALL_MODELS.forEach(([name, model]) => {
    WRITE_METHODS.forEach((method) => {
      expect(`${name}.${method}:${asMock(model)[method].mock.calls.length}`).toBe(`${name}.${method}:0`);
    });
  });
};

describe('createMongoLegacyDemographicsSource (ORG-040)', () => {
  let source: ReturnType<typeof createMongoLegacyDemographicsSource>;

  beforeEach(() => {
    jest.clearAllMocks();
    source = createMongoLegacyDemographicsSource();
  });

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  it('lists PersonalDemographic documents with a plain find', async () => {
    const rows = [{ _id: new ObjectId(), userId: new ObjectId(), race: 'African' }];
    asMock(PersonalDemographic).find.mockReturnValue(createQueryChain(rows));

    const result = await source.listPersonalDemographics();

    expect(result).toEqual(rows);
    expect(PersonalDemographic.find).toHaveBeenCalledWith({});
    expect(asMock(PersonalDemographic).find.mock.results[0].value.lean).toHaveBeenCalled();
  });

  it('lists UserDemographics documents', async () => {
    const rows = [{ _id: new ObjectId(), user: new ObjectId(), organization: new ObjectId() }];
    asMock(UserDemographics).find.mockReturnValue(createQueryChain(rows));

    const result = await source.listUserDemographics();

    expect(result).toEqual(rows);
    expect(UserDemographics.find).toHaveBeenCalledWith({});
  });

  it('excludes soft-deleted OrganizationDemographicsSettings rows', async () => {
    const rows = [{ _id: new ObjectId(), organization: new ObjectId(), age: true }];
    asMock(OrganizationDemographicsSettings).find.mockReturnValue(createQueryChain(rows));

    const result = await source.listOrganizationSettings();

    expect(result).toEqual(rows);
    expect(OrganizationDemographicsSettings.find).toHaveBeenCalledWith({ deleted: { $ne: true } });
  });

  it('lists memberships from the live User collection with a projection', async () => {
    const memberships: any[] = [{
      _id: new ObjectId(),
      clientId: new ObjectId(),
      organizationId: new ObjectId(ORG_ID),
      businessUnitId: null,
      enabled: true,
      roles: ['USER'],
    }];
    asMock(User).find.mockReturnValue(createQueryChain([{ _id: new ObjectId(USER_ID), memberships }]));

    const result = await source.listUserMemberships([USER_ID]);

    expect(result).toEqual([{ userId: USER_ID, memberships }]);
    expect(User.find).toHaveBeenCalledWith(
      { _id: { $in: [new ObjectId(USER_ID)] } },
      { memberships: 1 },
    );
  });

  it('treats a non-array memberships column as no memberships', async () => {
    asMock(User).find.mockReturnValue(createQueryChain([{ _id: new ObjectId(USER_ID), memberships: undefined }]));

    const result = await source.listUserMemberships([USER_ID]);

    expect(result).toEqual([{ userId: USER_ID, memberships: [] }]);
  });

  it('returns an empty membership list without querying when no id is valid', async () => {
    expect(await source.listUserMemberships([])).toEqual([]);
    expect(await source.listUserMemberships(['not-an-id'])).toEqual([]);
    expect(await source.listUserMemberships([''])).toEqual([]);
    expect(User.find).not.toHaveBeenCalled();
  });

  it('lists definitions including soft-deleted ones (the engine distinguishes the two)', async () => {
    const rows = [
      { _id: new ObjectId(), organization: new ObjectId(ORG_ID), key: 'gender', deleted: false },
      { _id: new ObjectId(), organization: new ObjectId(ORG_ID), key: 'race', deleted: true },
    ];
    asMock(DemographicDefinition).find.mockReturnValue(createQueryChain(rows));

    const result = await source.listDefinitions([ORG_ID, 'invalid-id', ORG_ID]);

    expect(result).toEqual(rows);
    const [query] = asMock(DemographicDefinition).find.mock.calls[0];
    expect(query.organization.$in).toHaveLength(1);
    expect(query).not.toHaveProperty('deleted');
  });

  it('returns no definitions without querying when the organization ids are invalid', async () => {
    expect(await source.listDefinitions([])).toEqual([]);
    expect(await source.listDefinitions(['nope'])).toEqual([]);
    expect(DemographicDefinition.find).not.toHaveBeenCalled();
  });

  it('lists existing values with the reporting projection', async () => {
    const rows = [{ organization: new ObjectId(ORG_ID), user: new ObjectId(USER_ID), key: 'gender', value: 'male' }];
    asMock(DemographicValue).find.mockReturnValue(createQueryChain(rows));

    const result = await source.listExistingValues([ORG_ID], [USER_ID]);

    expect(result).toEqual(rows);
    expect(DemographicValue.find).toHaveBeenCalledWith(
      { organization: { $in: [new ObjectId(ORG_ID)] }, user: { $in: [new ObjectId(USER_ID)] } },
      { organization: 1, user: 1, key: 1, value: 1 },
    );
  });

  it('returns no existing values when either side of the filter is empty', async () => {
    expect(await source.listExistingValues([], [USER_ID])).toEqual([]);
    expect(await source.listExistingValues([ORG_ID], [])).toEqual([]);
    expect(await source.listExistingValues(['bad'], ['worse'])).toEqual([]);
    expect(DemographicValue.find).not.toHaveBeenCalled();
  });

  it('lists legacy Demographic references with a projection', async () => {
    const referenceId = new ObjectId().toHexString();
    const rows = [{ _id: new ObjectId(referenceId), type: 'gender', key: 'female', title: 'Female' }];
    asMock(Demographic).find.mockReturnValue(createQueryChain(rows));

    const result = await source.listLegacyDemographicReferences([referenceId, 'invalid']);

    expect(result).toEqual(rows);
    expect(Demographic.find).toHaveBeenCalledWith(
      { _id: { $in: [new ObjectId(referenceId)] } },
      { type: 1, key: 1, title: 1 },
    );
  });

  it('returns no legacy references when no id is valid', async () => {
    expect(await source.listLegacyDemographicReferences([])).toEqual([]);
    expect(await source.listLegacyDemographicReferences(['nope'])).toEqual([]);
    expect(Demographic.find).not.toHaveBeenCalled();
  });

  it('finds an operational group by an escaped, case-insensitive exact title', async () => {
    const group = { _id: new ObjectId() };
    asMock(OperationalGroup).findOne.mockReturnValue(createQueryChain(group));

    const result = await source.findOperationalGroupByTitle('R&D (North)');

    expect(result).toEqual(group);
    const [query] = asMock(OperationalGroup).findOne.mock.calls[0];
    expect(query.title).toBeInstanceOf(RegExp);
    expect(query.title.test('R&D (North)')).toBe(true);
    expect(query.title.test('R&D (North) Extra')).toBe(false);
    expect(query.title.test('r&d (north)')).toBe(true);
    // The parentheses/dot are escaped, so they are literals rather than groups.
    expect(query.title.test('RxD (North)')).toBe(false);
  });

  it('returns null for a blank or missing operational group title without querying', async () => {
    expect(await source.findOperationalGroupByTitle('')).toBeNull();
    expect(await source.findOperationalGroupByTitle('   ')).toBeNull();
    expect(await source.findOperationalGroupByTitle(undefined as any)).toBeNull();
    expect(OperationalGroup.findOne).not.toHaveBeenCalled();
  });

  it('checks reference existence per supported model', async () => {
    const support: Array<[any, string]> = [
      [BusinessUnit, 'BusinessUnit'],
      [OperationalGroup, 'OperationalGroup'],
      [Organization, 'Organization'],
      [Region, 'Region'],
      [Team, 'Team'],
    ];

    for (const [model, name] of support) {
      asMock(model).countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
      // eslint-disable-next-line no-await-in-loop
      expect(await source.referenceExists(name, REGION_ID)).toBe(true);
      expect(model.countDocuments).toHaveBeenCalledWith({ _id: new ObjectId(REGION_ID) });
    }

    asMock(Region).countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    expect(await source.referenceExists('Region', REGION_ID)).toBe(false);
  });

  it('returns false for an unsupported model or a malformed id without querying', async () => {
    expect(await source.referenceExists('Gender', REGION_ID)).toBe(false);
    expect(await source.referenceExists('Region', 'not-an-id')).toBe(false);
    expect(await source.referenceExists('Region', '')).toBe(false);

    expect(Region.countDocuments).not.toHaveBeenCalled();
    expect(BusinessUnit.countDocuments).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Read-only guarantee
  // ---------------------------------------------------------------------------

  it('never writes to any legacy or new model, and exposes only read methods', async () => {
    asMock(PersonalDemographic).find.mockReturnValue(createQueryChain([{ _id: new ObjectId(), userId: USER_ID }]));
    asMock(UserDemographics).find.mockReturnValue(createQueryChain([]));
    asMock(OrganizationDemographicsSettings).find.mockReturnValue(createQueryChain([]));
    asMock(User).find.mockReturnValue(createQueryChain([{ _id: new ObjectId(USER_ID), memberships: [] }]));
    asMock(DemographicDefinition).find.mockReturnValue(createQueryChain([]));
    asMock(DemographicValue).find.mockReturnValue(createQueryChain([]));
    asMock(Demographic).find.mockReturnValue(createQueryChain([]));
    asMock(OperationalGroup).findOne.mockReturnValue(createQueryChain(null));
    asMock(Region).countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    // Exercise every read path the engine can reach.
    await source.listPersonalDemographics();
    await source.listUserDemographics();
    await source.listOrganizationSettings();
    await source.listUserMemberships([USER_ID]);
    await source.listDefinitions([ORG_ID]);
    await source.listExistingValues([ORG_ID], [USER_ID]);
    await source.listLegacyDemographicReferences([REGION_ID]);
    await source.findOperationalGroupByTitle('Operations');
    await source.referenceExists('Region', REGION_ID);

    expectNoWrites();

    // The exported shape itself must not offer a write entry point at all.
    const exported = Object.keys(source);
    expect(exported.sort()).toEqual([
      'findOperationalGroupByTitle',
      'listDefinitions',
      'listExistingValues',
      'listLegacyDemographicReferences',
      'listOrganizationSettings',
      'listPersonalDemographics',
      'listUserDemographics',
      'listUserMemberships',
      'referenceExists',
    ]);
    exported.forEach((method) => {
      expect(method).not.toMatch(/create|update|delete|insert|save|remove|write/i);
    });
  });
});

describe('createDemographicsServiceTarget (ORG-040)', () => {
  it('forwards value writes to saveValues with the caller execution context', async () => {
    const saveValues = jest.fn().mockResolvedValue([{ key: 'gender' }]);
    const setEnabled = jest.fn().mockResolvedValue({ key: 'gender' });
    const context = { user: { _id: USER_ID } };

    const target = createDemographicsServiceTarget({ saveValues, setEnabled }, context);
    const values = [{
      user: USER_ID,
      key: 'gender',
      value: 'male',
      source: 'import' as const,
      verified: false as const,
    }];

    await target.writeValues(ORG_ID, values);

    expect(saveValues).toHaveBeenCalledWith(ORG_ID, values, context);
  });

  it('forwards enablement to setEnabled with the caller execution context', async () => {
    const saveValues = jest.fn();
    const setEnabled = jest.fn().mockResolvedValue({ key: 'race' });
    const context = { user: { _id: USER_ID } };

    const target = createDemographicsServiceTarget({ saveValues, setEnabled }, context);

    await target.setEnabled(ORG_ID, 'race', false);

    expect(setEnabled).toHaveBeenCalledWith(ORG_ID, 'race', false, context);
    expect(saveValues).not.toHaveBeenCalled();
  });

  it('propagates a rejected write so the engine can count it as a failure', async () => {
    const target = createDemographicsServiceTarget({
      saveValues: jest.fn().mockRejectedValue(new Error('not permitted')),
      setEnabled: jest.fn().mockRejectedValue(new Error('not permitted')),
    }, {});

    await expect(target.writeValues(ORG_ID, [])).rejects.toThrow('not permitted');
    await expect(target.setEnabled(ORG_ID, 'race', true)).rejects.toThrow('not permitted');
  });
});
