import { ObjectId } from 'mongodb';
import DemographicResolver from '../DemographicResolver';
import OrganizationResolver from '../../Organization/Organization';
import { mergeGraphResolver } from '@reactory/server-core/utils';

/**
 * The resolver decorators harvest decorated methods onto `target.resolver`, so
 * the tests call the harvested functions exactly the way the GraphQL layer
 * does.
 */
const harvest = () => {
  const instance: any = Object.create((DemographicResolver as any).prototype);
  const map = instance.resolver;
  return {
    Query: { ...map.Query },
    Mutation: { ...map.Mutation },
    Organization: { ...map.Organization },
    DemographicDefinition: { ...map.DemographicDefinition },
    DemographicValue: { ...map.DemographicValue },
    OrganizationDemographicsPolicy: { ...map.OrganizationDemographicsPolicy },
  };
};

const makeService = () => ({
  list: jest.fn().mockResolvedValue([{ key: 'employment-type' }]),
  get: jest.fn().mockResolvedValue({ key: 'employment-type' }),
  save: jest.fn().mockResolvedValue({ key: 'employment-type' }),
  remove: jest.fn().mockResolvedValue(true),
  reorder: jest.fn().mockResolvedValue([]),
  setEnabled: jest.fn().mockResolvedValue({ key: 'employment-type', enabled: false }),
  getPolicy: jest.fn().mockResolvedValue({ selfServiceEnabled: true, adminOnlyKeys: [] }),
  updatePolicy: jest.fn().mockResolvedValue({ selfServiceEnabled: false }),
  listValues: jest.fn().mockResolvedValue({ values: [], paging: { total: 0 } }),
  getUserValues: jest.fn().mockResolvedValue([{ key: 'employment-type' }]),
  saveValue: jest.fn().mockResolvedValue({ key: 'employment-type' }),
  saveValues: jest.fn().mockResolvedValue([]),
  deleteValue: jest.fn().mockResolvedValue(true),
  saveSelfServiceValues: jest.fn().mockResolvedValue([{ key: 'employment-type' }]),
  aggregate: jest.fn().mockResolvedValue({ organization: 'org', definitions: [] }),
  aggregateCsv: jest.fn().mockResolvedValue('organization,minimum_group_size\n'),
});

const makeContext = (roles: string[]) => {
  const service = makeService();

  const context: any = {
    user: {
      _id: new ObjectId(),
      email: 'operator@reactory.net',
      hasRole: jest.fn((_clientId: string, role: string, organizationId?: string) => {
        if (roles.indexOf(role) < 0) return false;
        if (role === 'ORGANIZATION_ADMIN') return typeof organizationId === 'string';
        return true;
      }),
    },
    partner: { _id: 'partner-1' },
    hasRole: jest.fn((role: string) => roles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => roles.length > 0),
    getService: jest.fn(() => service),
    log: jest.fn(),
  };

  return { context, service };
};

const ORGANIZATION_ID = `${new ObjectId()}`;

describe('DemographicResolver (ORG-006)', () => {
  it('merges into the core resolver map without clobbering organization resolvers', () => {
    const merged: any = mergeGraphResolver([OrganizationResolver, DemographicResolver]);

    expect(merged.Query.OrganizationDemographicDefinitions).toBeDefined();
    expect(merged.Query.OrganizationDemographicDefinition).toBeDefined();
    expect(merged.Query.OrganizationDemographicValues).toBeDefined();
    expect(merged.Query.MyDemographics).toBeDefined();
    expect(merged.Query.OrganizationDemographicAggregates).toBeDefined();
    expect(merged.Query.OrganizationDemographicAggregatesCsv).toBeDefined();
    expect(merged.Mutation.OrganizationSaveDemographicDefinition).toBeDefined();
    expect(merged.Mutation.MySaveDemographics).toBeDefined();
    expect(merged.Organization.demographicsPolicy).toBeDefined();

    // The existing organization surface is untouched.
    expect(merged.Query.CoreOrganization).toBeDefined();
    expect(merged.Mutation.createOrganization).toBeDefined();
  });

  it('delegates the ORG-035 aggregate queries, sharing the caller\'s context', async () => {
    const merged: any = mergeGraphResolver([OrganizationResolver, DemographicResolver]);
    const { context, service } = makeContext(['ORGANIZATION_ADMIN']);
    const filter = { region: 'region-1' };

    await merged.Query.OrganizationDemographicAggregates(
      {},
      { organizationId: ORGANIZATION_ID, definitionKeys: ['gender'], filter },
      context,
    );
    expect(service.aggregate).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      ['gender'],
      filter,
      context,
    );

    // The CSV export must go through the same service entry point, so it can
    // never bypass the authorization/suppression/audit of the JSON report.
    await merged.Query.OrganizationDemographicAggregatesCsv(
      {},
      { organizationId: ORGANIZATION_ID, definitionKeys: ['gender'], filter },
      context,
    );
    expect(service.aggregateCsv).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      ['gender'],
      filter,
      context,
    );
  });

  /**
   * The original version of this test only checked Query/Mutation entries and
   * therefore missed that the merge *replaced* the whole `Organization` type
   * map: adding `demographicsPolicy` silently dropped OrganizationResolver's
   * eight fields, so `businessUnits`, `avatarURL`/`logoURL` and the
   * `tradingName` fallback became unresolvable at runtime. Assert the complete
   * property map so this can never regress silently again.
   */
  it('keeps every Organization property resolver when demographics is merged in', async () => {
    const merged: any = mergeGraphResolver([OrganizationResolver, DemographicResolver]);

    expect(Object.keys(merged.Organization).sort()).toEqual(
      [
        'avatar',
        'avatarURL',
        'businessUnits',
        'createdAt',
        'demographicsPolicy',
        'id',
        'logoURL',
        'tradingName',
        'updatedAt',
      ].sort(),
    );

    // ...and they are still the original callables, bound and working.
    expect(merged.Organization.tradingName({ name: 'Acme', tradingName: null })).toBe('Acme');
    expect(merged.Organization.id({ _id: 'abc' })).toBe('abc');
    expect(merged.Organization.avatarURL({ avatar: null, logo: null })).toBeNull();

    // `businessUnits` was the field that silently stopped resolving: with a
    // populated document it must return that array without querying.
    const businessUnits = [{ name: 'Engineering' }];
    const resolved = await merged.Organization.businessUnits(
      { _id: 'abc', businessUnits },
      {},
      makeContext(['USER']).context,
      {},
    );
    expect(resolved).toBe(businessUnits);
  });

  it('exposes every demographic definition/value mutation', () => {
    const map = harvest();

    expect(Object.keys(map.Mutation)).toEqual(
      expect.arrayContaining([
        'OrganizationSaveDemographicDefinition',
        'OrganizationDeleteDemographicDefinition',
        'OrganizationReorderDemographicDefinitions',
        'OrganizationSetDemographicEnabled',
        'OrganizationUpdateDemographicsPolicy',
        'OrganizationSaveDemographicValue',
        'OrganizationBulkSaveDemographicValues',
        'OrganizationDeleteDemographicValue',
        'MySaveDemographics',
      ]),
    );

    expect(Object.keys(map.Query)).toEqual(
      expect.arrayContaining([
        'OrganizationDemographicDefinitions',
        'OrganizationDemographicDefinition',
        'OrganizationDemographicValues',
        'MyDemographics',
      ]),
    );
  });

  describe('role enforcement', () => {
    const configMutations: Array<[string, Record<string, unknown>, string]> = [
      [
        'OrganizationSaveDemographicDefinition',
        { organizationId: ORGANIZATION_ID, definition: { key: 'x', title: 'X', valueType: 'string' } },
        'save',
      ],
      ['OrganizationDeleteDemographicDefinition', { organizationId: ORGANIZATION_ID, key: 'x' }, 'remove'],
      [
        'OrganizationReorderDemographicDefinitions',
        { organizationId: ORGANIZATION_ID, keys: ['x'] },
        'reorder',
      ],
      [
        'OrganizationSetDemographicEnabled',
        { organizationId: ORGANIZATION_ID, key: 'x', enabled: false },
        'setEnabled',
      ],
      [
        'OrganizationUpdateDemographicsPolicy',
        { organizationId: ORGANIZATION_ID, policy: { selfServiceEnabled: false } },
        'updatePolicy',
      ],
      [
        'OrganizationSaveDemographicValue',
        { organizationId: ORGANIZATION_ID, value: { key: 'x', value: 'y' } },
        'saveValue',
      ],
      [
        'OrganizationBulkSaveDemographicValues',
        { organizationId: ORGANIZATION_ID, values: [{ key: 'x', value: 'y' }] },
        'saveValues',
      ],
    ];

    it.each(configMutations)('rejects a plain USER for %s', (mutation, args, method) => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      // @roles throws synchronously, before the delegation runs.
      expect(() => map.Mutation[mutation](null, args, context, {})).toThrow(/permissions/i);
      expect((service as any)[method]).not.toHaveBeenCalled();
    });

    it.each(configMutations)('allows an ORGANIZATION_ADMIN to call %s', async (mutation, args, method) => {
      const map = harvest();
      const { context, service } = makeContext(['USER', 'ORGANIZATION_ADMIN']);

      await map.Mutation[mutation](null, args, context, {});

      expect((service as any)[method]).toHaveBeenCalled();
    });

    it('denies the organization-wide value listing to a plain USER', () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      expect(() =>
        map.Query.OrganizationDemographicValues(null, { organizationId: ORGANIZATION_ID }, context, {}),
      ).toThrow(/permissions/i);
      expect(service.listValues).not.toHaveBeenCalled();
    });

    it('denies an unauthenticated caller', () => {
      const map = harvest();
      const { context } = makeContext([]);
      context.user = null;

      expect(() =>
        map.Query.OrganizationDemographicDefinitions(null, { organizationId: ORGANIZATION_ID }, context, {}),
      ).toThrow();
    });
  });

  describe('delegation', () => {
    it('passes organizationId and includeDisabled to the definitions query', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      await map.Query.OrganizationDemographicDefinitions(
        null,
        { organizationId: ORGANIZATION_ID, includeDisabled: true },
        context,
        {},
      );

      expect(service.list).toHaveBeenCalledWith(ORGANIZATION_ID, true, context);
    });

    it('defaults includeDisabled to false', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      await map.Query.OrganizationDemographicDefinitions(null, { organizationId: ORGANIZATION_ID }, context, {});

      expect(service.list).toHaveBeenCalledWith(ORGANIZATION_ID, false, context);
    });

    it('loads a definition by key', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      await map.Query.OrganizationDemographicDefinition(null, { organizationId: ORGANIZATION_ID, key: 'x' }, context, {});

      expect(service.get).toHaveBeenCalledWith(ORGANIZATION_ID, 'x', context);
    });

    it("reads the caller's own values and ignores membershipId for selection", async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      await map.Query.MyDemographics(
        null,
        { organizationId: ORGANIZATION_ID, membershipId: `${new ObjectId()}` },
        context,
        {},
      );

      expect(service.getUserValues).toHaveBeenCalledWith(
        ORGANIZATION_ID,
        `${context.user._id}`,
        context,
      );
    });

    it("saves the caller's own values through the self-service path", async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);
      const values = [{ key: 'employment-type', value: 'permanent' }];

      await map.Mutation.MySaveDemographics(
        null,
        { organizationId: ORGANIZATION_ID, values, membershipId: 'membership-1' },
        context,
        {},
      );

      expect(service.saveSelfServiceValues).toHaveBeenCalledWith(
        ORGANIZATION_ID,
        values,
        'membership-1',
        context,
      );
    });

    it('delegates the remaining value operations', async () => {
      const map = harvest();
      const { context, service } = makeContext(['ADMIN']);

      await map.Query.OrganizationDemographicValues(
        null,
        { organizationId: ORGANIZATION_ID, filter: { key: 'x' }, paging: { page: 2, pageSize: 10 } },
        context,
        {},
      );
      expect(service.listValues).toHaveBeenCalledWith(
        ORGANIZATION_ID,
        { key: 'x' },
        { page: 2, pageSize: 10 },
        context,
      );

      await map.Mutation.OrganizationDeleteDemographicValue(
        null,
        { organizationId: ORGANIZATION_ID, key: 'x', user: 'user-2' },
        context,
        {},
      );
      expect(service.deleteValue).toHaveBeenCalledWith(ORGANIZATION_ID, 'x', 'user-2', context);

      await map.Mutation.OrganizationUpdateDemographicsPolicy(
        null,
        { organizationId: ORGANIZATION_ID, policy: { selfServiceEnabled: false } },
        context,
        {},
      );
      expect(service.updatePolicy).toHaveBeenCalledWith(
        ORGANIZATION_ID,
        { selfServiceEnabled: false },
        context,
      );
    });
  });

  describe('property resolvers', () => {
    it('resolves id from _id for lean documents', () => {
      const map = harvest();
      const id = new ObjectId();

      expect(map.DemographicDefinition.id({ _id: id })).toBe(`${id}`);
      expect(map.DemographicValue.id({ id: 'value-1' })).toBe('value-1');
      expect(map.OrganizationDemographicsPolicy.id({})).toBeNull();
    });

    it('reads the JSON schema through get() on a hydrated definition', () => {
      const map = harvest();
      const schema = { type: 'string' };

      expect(
        map.DemographicDefinition.schema({
          get: (path: string) => (path === 'schema' ? schema : undefined),
        }),
      ).toEqual(schema);
      expect(map.DemographicDefinition.schema({ schema })).toEqual(schema);
    });

    it('loads the organization policy for the Organization type', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      await map.Organization.demographicsPolicy({ _id: ORGANIZATION_ID }, {}, context, {});

      expect(service.getPolicy).toHaveBeenCalledWith(ORGANIZATION_ID, context);
    });

    it('returns an already-materialised policy without a lookup', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);
      const policy = { selfServiceEnabled: false };

      await expect(
        map.Organization.demographicsPolicy(
          { _id: ORGANIZATION_ID, demographicsPolicy: policy },
          {},
          context,
          {},
        ),
      ).resolves.toBe(policy);
      expect(service.getPolicy).not.toHaveBeenCalled();
    });
  });
});
