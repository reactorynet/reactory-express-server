import { ObjectId } from 'mongodb';
import { DemographicsService } from '../DemographicsService';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const DemographicDefinition: any = jest.fn();
  DemographicDefinition.findOne = jest.fn();
  DemographicDefinition.find = jest.fn();

  const DemographicValue: any = jest.fn();
  DemographicValue.findOne = jest.fn();
  DemographicValue.find = jest.fn();
  DemographicValue.countDocuments = jest.fn();
  DemographicValue.deleteOne = jest.fn();

  const OrganizationDemographicsPolicy: any = jest.fn();
  OrganizationDemographicsPolicy.findOne = jest.fn();

  return { DemographicDefinition, DemographicValue, OrganizationDemographicsPolicy };
});

const models = require('@reactory/server-modules/reactory-core/models');

/**
 * The REAL `User` model, for the same reason ORG-005's suite uses it: the
 * authorization matrix must run against the shipped `hasRole`
 * implementation, which ends with a document-level fallback. A hand-rolled
 * mock would encode the intended semantics instead of the real ones.
 */
const RealUserModel = jest.requireActual(
  '@reactory/server-modules/reactory-core/models/User',
).default;

/**
 * `admin`     - platform ADMIN, any organization.
 * `orgAdminOf` - ids of organizations the caller administers.
 * `memberOf`   - ids of organizations the caller is a plain member of.
 * `system`     - the SYSTEM service role.
 */
interface IRolePolicy {
  admin?: boolean;
  orgAdminOf?: string[];
  memberOf?: string[];
  system?: boolean;
}

/** Builds a context around a real User document, as the request pipeline does. */
const makeContext = (policy: IRolePolicy = {}) => {
  const partnerId = new ObjectId();
  const orgAdminOf = policy.orgAdminOf || [];

  const memberships: any[] = [
    {
      clientId: partnerId,
      organizationId: null,
      businessUnitId: null,
      roles: ['USER'],
      enabled: true,
    },
    ...(policy.memberOf || []).map((organizationId) => ({
      clientId: partnerId,
      organizationId: new ObjectId(organizationId),
      businessUnitId: null,
      roles: ['USER'],
      enabled: true,
    })),
    ...orgAdminOf.map((organizationId) => ({
      clientId: partnerId,
      organizationId: new ObjectId(organizationId),
      businessUnitId: null,
      roles: ['USER', 'ORGANIZATION_ADMIN'],
      enabled: true,
    })),
  ];

  const documentRoles: string[] = ['USER'];
  if (policy.admin) documentRoles.push('ADMIN');
  if (policy.system) documentRoles.push('SYSTEM');
  if (orgAdminOf.length > 0) documentRoles.push('ORGANIZATION_ADMIN');

  const user: any = new RealUserModel({
    _id: new ObjectId(),
    email: `operator-${new ObjectId()}@example.com`,
    roles: documentRoles,
    memberships,
  });
  user.save = jest.fn().mockResolvedValue(user);

  const context: any = {
    user,
    partner: { _id: partnerId },
    hasRole: jest.fn((role: string) => documentRoles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => true),
    log: jest.fn(),
    error: jest.fn(),
    getService: jest.fn(),
  };

  return context;
};

const makeDefinition = (overrides: Record<string, any> = {}): any => {
  const document: any = {
    _id: new ObjectId(),
    organization: new ObjectId(),
    key: 'employment-type',
    title: 'Employment type',
    valueType: 'enum',
    options: [
      { key: 'permanent', label: 'Permanent', ordinal: 1, deprecated: false },
      { key: 'contract', label: 'Contract', ordinal: 2, deprecated: false },
    ],
    required: false,
    multiValued: false,
    sensitive: false,
    searchable: false,
    enabled: true,
    ordinal: 0,
    roles: [],
    system: false,
    deleted: false,
    save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn(function toObject(this: any) {
      const { save, set, toObject: toObjectFn, ...rest } = this as any;
      return rest;
    }),
    ...overrides,
  };

  document.set = jest.fn((path: string, value: any) => {
    document[path] = value;
  });

  return document;
};

const makeValueDocument = (overrides: Record<string, any> = {}): any => ({
  _id: new ObjectId(),
  organization: new ObjectId(),
  user: new ObjectId(),
  definition: new ObjectId(),
  key: 'employment-type',
  value: 'permanent',
  valueType: 'enum',
  source: 'user',
  verified: false,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

/** Minimal Mongoose query stand-in: records the chain, resolves when awaited. */
const makeFindQuery = (rows: any[]) => {
  const query: any = {};
  query.sort = jest.fn(() => query);
  query.skip = jest.fn(() => query);
  query.limit = jest.fn(() => query);
  query.then = (resolve?: any, reject?: any) => Promise.resolve(rows).then(resolve, reject);
  return query;
};

const ORGANIZATION_ID = `${new ObjectId()}`;

const adminService = (policy: IRolePolicy = { admin: true }) =>
  new DemographicsService({}, makeContext(policy));

describe('DemographicsService - definitions (ORG-006)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.DemographicDefinition.mockImplementation((doc: any) => makeDefinition(doc));
    models.DemographicValue.mockImplementation((doc: any) => makeValueDocument(doc));
    models.OrganizationDemographicsPolicy.mockImplementation((doc: any) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(undefined),
    }));
  });

  describe('list', () => {
    it('excludes disabled definitions by default and orders by ordinal', async () => {
      const query = makeFindQuery([makeDefinition()]);
      models.DemographicDefinition.find.mockReturnValue(query);

      await adminService().list(ORGANIZATION_ID);

      expect(models.DemographicDefinition.find).toHaveBeenCalledWith({
        organization: new ObjectId(ORGANIZATION_ID),
        deleted: { $ne: true },
        enabled: true,
      });
      expect(query.sort).toHaveBeenCalledWith({ ordinal: 1, title: 1 });
    });

    it('includes disabled definitions when asked', async () => {
      models.DemographicDefinition.find.mockReturnValue(makeFindQuery([]));

      await adminService().list(ORGANIZATION_ID, true);

      const query = models.DemographicDefinition.find.mock.calls[0][0];
      expect(query).not.toHaveProperty('enabled');
      expect(query.deleted).toEqual({ $ne: true });
    });

    it('rejects an invalid organization id', async () => {
      await expect(adminService().list('nope')).rejects.toThrow(/not a valid/);
      expect(models.DemographicDefinition.find).not.toHaveBeenCalled();
    });

    it('denies a user who is not a member of the organization', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(service.list(ORGANIZATION_ID)).rejects.toThrow(/permission to access organization/i);
      expect(models.DemographicDefinition.find).not.toHaveBeenCalled();
    });

    it('filters sensitive definitions out of a member\'s listing', async () => {
      models.DemographicDefinition.find.mockReturnValue(makeFindQuery([]));

      await new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] })).list(
        ORGANIZATION_ID,
        true,
      );

      expect(models.DemographicDefinition.find.mock.calls[0][0]).toMatchObject({
        organization: new ObjectId(ORGANIZATION_ID),
        sensitive: { $ne: true },
      });
    });

    it('returns sensitive definitions to an organization administrator', async () => {
      models.DemographicDefinition.find.mockReturnValue(makeFindQuery([]));

      await adminService().list(ORGANIZATION_ID, true);

      expect(models.DemographicDefinition.find.mock.calls[0][0]).not.toHaveProperty('sensitive');
    });
  });

  describe('get', () => {
    it('returns the definition for the organization', async () => {
      const definition = makeDefinition();
      models.DemographicDefinition.findOne.mockResolvedValue(definition);

      await expect(adminService().get(ORGANIZATION_ID, 'Employment-Type')).resolves.toBe(definition);
      expect(models.DemographicDefinition.findOne).toHaveBeenCalledWith({
        organization: new ObjectId(ORGANIZATION_ID),
        key: 'employment-type',
        deleted: { $ne: true },
      });
    });

    it('rejects an unknown key with a clear message', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      await expect(adminService().get(ORGANIZATION_ID, 'nope')).rejects.toThrow(
        /was not found in organization/,
      );
    });

    it('requires a key', async () => {
      await expect(adminService().get(ORGANIZATION_ID, '   ')).rejects.toThrow(/key is required/);
    });

    it('denies a user who is not a member of the organization', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(service.get(ORGANIZATION_ID, 'employment-type')).rejects.toThrow(
        /permission to access organization/i,
      );
      expect(models.DemographicDefinition.findOne).not.toHaveBeenCalled();
    });

    it('denies a member reading a sensitive definition', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(makeDefinition({ sensitive: true }));

      await expect(
        new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] })).get(
          ORGANIZATION_ID,
          'employment-type',
        ),
      ).rejects.toThrow(/is sensitive and can only be read by an organization administrator/);
    });

    it('allows an organization administrator to read a sensitive definition', async () => {
      const definition = makeDefinition({ sensitive: true });
      models.DemographicDefinition.findOne.mockResolvedValue(definition);

      await expect(adminService().get(ORGANIZATION_ID, 'employment-type')).resolves.toBe(definition);
    });

    it('still allows a member to read a non-sensitive definition', async () => {
      const definition = makeDefinition();
      models.DemographicDefinition.findOne.mockResolvedValue(definition);

      await expect(
        new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] })).get(
          ORGANIZATION_ID,
          'employment-type',
        ),
      ).resolves.toBe(definition);
    });
  });

  describe('save - create', () => {
    it('creates a definition with the caller recorded as author', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      const context = makeContext({ admin: true });
      const service = new DemographicsService({}, context);

      const definition = await service.save(ORGANIZATION_ID, {
        key: 'Employment-Type',
        title: 'Employment type',
        valueType: 'enum',
        options: [{ key: 'Permanent', label: 'Permanent' }],
      } as any);

      expect(models.DemographicDefinition.findOne).toHaveBeenCalledWith({
        organization: new ObjectId(ORGANIZATION_ID),
        key: 'employment-type',
      });
      expect(models.DemographicDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: new ObjectId(ORGANIZATION_ID),
          key: 'employment-type',
          deleted: false,
          createdBy: context.user._id,
          updatedBy: context.user._id,
        }),
      );
      expect(definition.save).toHaveBeenCalledTimes(1);
      expect(definition.title).toBe('Employment type');
      // Option keys are normalised the same way the definition key is.
      expect(definition.options[0].key).toBe('permanent');
    });

    it('rejects an incomplete definition with field-level detail', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      await expect(
        adminService().save(ORGANIZATION_ID, { key: 'no-title' } as any),
      ).rejects.toMatchObject({
        message: /not valid/i,
        meta: {
          fields: expect.arrayContaining([
            expect.objectContaining({ path: 'title' }),
            expect.objectContaining({ path: 'valueType' }),
          ]),
        },
      });
      expect(models.DemographicDefinition).not.toHaveBeenCalled();
    });

    it('rejects an enum definition without options', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      await expect(
        adminService().save(ORGANIZATION_ID, {
          key: 'employment-type',
          title: 'Employment type',
          valueType: 'enum',
          options: [],
        } as any),
      ).rejects.toMatchObject({
        meta: { fields: [{ path: 'options', message: expect.stringMatching(/at least one option/i) }] },
      });
    });

    it('rejects an unknown reference model', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      await expect(
        adminService().save(ORGANIZATION_ID, {
          key: 'business-unit',
          title: 'Business unit',
          valueType: 'reference',
          reference: { model: 'Spaceship' },
        } as any),
      ).rejects.toMatchObject({
        meta: {
          fields: [{ path: 'reference.model', message: expect.stringMatching(/must be one of/i) }],
        },
      });
    });

    it('rejects an enum definition whose options are omitted entirely', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      await expect(
        adminService().save(ORGANIZATION_ID, {
          key: 'employment-type',
          title: 'Employment type',
          valueType: 'enum',
        } as any),
      ).rejects.toMatchObject({
        meta: { fields: [{ path: 'options', message: expect.stringMatching(/at least one option/i) }] },
      });

      expect(models.DemographicDefinition).not.toHaveBeenCalled();
    });

    it('rejects a reference definition whose reference is omitted entirely', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      await expect(
        adminService().save(ORGANIZATION_ID, {
          key: 'business-unit',
          title: 'Business unit',
          valueType: 'reference',
        } as any),
      ).rejects.toMatchObject({
        meta: {
          fields: [{ path: 'reference.model', message: expect.stringMatching(/must be one of/i) }],
        },
      });

      expect(models.DemographicDefinition).not.toHaveBeenCalled();
    });

    it('creates a system definition, which ORG-030 seeds through this path', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      const definition = await adminService().save(ORGANIZATION_ID, {
        key: 'gender',
        title: 'Gender',
        valueType: 'enum',
        options: [{ key: 'female', label: 'Female' }, { key: 'male', label: 'Male' }],
        system: true,
      } as any);

      expect(models.DemographicDefinition).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'gender', system: true }),
      );
      expect(definition.system).toBe(true);
    });

    it('defaults the system flag to false when it is omitted', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);

      await adminService().save(ORGANIZATION_ID, {
        key: 'nickname',
        title: 'Nickname',
        valueType: 'string',
      } as any);

      expect(models.DemographicDefinition).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'nickname', system: false }),
      );
    });
  });

  describe('save - update', () => {
    it('updates the definition and persists the schema through set()', async () => {
      const existing = makeDefinition();
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await adminService().save(ORGANIZATION_ID, {
        id: `${existing._id}`,
        title: 'Employment category',
        schema: { type: 'string' },
        enabled: false,
      } as any);

      expect(existing.title).toBe('Employment category');
      expect(existing.enabled).toBe(false);
      expect(existing.set).toHaveBeenCalledWith('schema', { type: 'string' });
      expect(existing.schema).toEqual({ type: 'string' });
      expect(existing.save).toHaveBeenCalledTimes(1);
    });

    it('refuses to change the key of an existing definition', async () => {
      const existing = makeDefinition();
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await expect(
        adminService().save(ORGANIZATION_ID, { id: `${existing._id}`, key: 'renamed' } as any),
      ).rejects.toThrow(/immutable/);

      expect(existing.key).toBe('employment-type');
      expect(existing.save).not.toHaveBeenCalled();
    });

    it('refuses to change the value type of a system definition', async () => {
      const existing = makeDefinition({ system: true, valueType: 'string' });
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await expect(
        adminService().save(ORGANIZATION_ID, { key: 'employment-type', valueType: 'number' } as any),
      ).rejects.toThrow(/cannot change its value type/);

      expect(existing.valueType).toBe('string');
      expect(existing.save).not.toHaveBeenCalled();
    });

    it('refuses to drop the system flag (a two-step valueType bypass)', async () => {
      const existing = makeDefinition({ system: true });
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await expect(
        adminService().save(ORGANIZATION_ID, { key: 'employment-type', system: false } as any),
      ).rejects.toThrow(/cannot be converted to a user-defined definition/);
    });

    it('refuses to silently revive a soft-deleted definition', async () => {
      const existing = makeDefinition({ deleted: true });
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await expect(
        adminService().save(ORGANIZATION_ID, { key: 'employment-type', title: 'Again' } as any),
      ).rejects.toThrow(/has been deleted/);

      expect(existing.save).not.toHaveBeenCalled();
    });

    it('refuses to promote a user-defined definition to a system definition', async () => {
      const existing = makeDefinition({ system: false });
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await expect(
        adminService().save(ORGANIZATION_ID, { key: 'employment-type', system: true } as any),
      ).rejects.toThrow(/cannot be converted to a system definition/);

      expect(existing.system).toBe(false);
      expect(existing.save).not.toHaveBeenCalled();
    });

    it('validates the merged definition, so a title-only update of an enum still passes', async () => {
      const existing = makeDefinition();
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await adminService().save(ORGANIZATION_ID, {
        key: 'employment-type',
        title: 'Employment category',
      } as any);

      expect(existing.title).toBe('Employment category');
      // The stored options were not part of the patch and must not be required.
      expect(existing.options).toHaveLength(2);
      expect(existing.save).toHaveBeenCalledTimes(1);
    });

    it('refuses to strip options from an existing enum definition', async () => {
      const existing = makeDefinition();
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await expect(
        adminService().save(ORGANIZATION_ID, {
          key: 'employment-type',
          options: [],
        } as any),
      ).rejects.toMatchObject({
        meta: { fields: [{ path: 'options', message: expect.stringMatching(/at least one option/i) }] },
      });

      expect(existing.save).not.toHaveBeenCalled();
    });

    it('allows a system definition to be renamed and reordered', async () => {
      const existing = makeDefinition({ system: true });
      models.DemographicDefinition.findOne.mockResolvedValue(existing);

      await adminService().save(ORGANIZATION_ID, {
        key: 'employment-type',
        title: 'Employment',
        ordinal: 4,
      } as any);

      expect(existing.title).toBe('Employment');
      expect(existing.ordinal).toBe(4);
      expect(existing.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('authorization', () => {
    it('denies a plain USER', async () => {
      const context = makeContext({});
      const service = new DemographicsService({}, context);

      await expect(
        service.save(ORGANIZATION_ID, {
          key: 'employment-type',
          title: 'Employment type',
          valueType: 'string',
        } as any),
      ).rejects.toThrow(/permission/i);

      expect(models.DemographicDefinition.findOne).not.toHaveBeenCalled();
    });

    it('denies an ORGANIZATION_ADMIN of organization A on organization B', async () => {
      const organizationA = `${new ObjectId()}`;
      const organizationB = `${new ObjectId()}`;
      const service = new DemographicsService({}, makeContext({ orgAdminOf: [organizationA] }));

      await expect(
        service.save(organizationB, {
          key: 'employment-type',
          title: 'Employment type',
          valueType: 'string',
        } as any),
      ).rejects.toThrow(/permission/i);
      expect(models.DemographicDefinition.findOne).not.toHaveBeenCalled();
    });

    it('allows an ORGANIZATION_ADMIN of this organization', async () => {
      models.DemographicDefinition.findOne.mockResolvedValue(null);
      const service = new DemographicsService({}, makeContext({ orgAdminOf: [ORGANIZATION_ID] }));

      await expect(
        service.save(ORGANIZATION_ID, {
          key: 'employment-type',
          title: 'Employment type',
          valueType: 'string',
        } as any),
      ).resolves.toBeDefined();
    });

    it('denies an unauthenticated caller', async () => {
      const context = makeContext({ admin: true });
      context.user = null;
      const service = new DemographicsService({}, context);

      await expect(service.list(ORGANIZATION_ID)).rejects.toThrow(/authenticated/i);
    });
  });

  describe('remove', () => {
    it('rejects deletion while values still reference the definition', async () => {
      const definition = makeDefinition();
      models.DemographicDefinition.findOne.mockResolvedValue(definition);
      models.DemographicValue.countDocuments.mockReturnValue({
        then: (resolve: any) => Promise.resolve(2).then(resolve),
      });

      await expect(adminService().remove(ORGANIZATION_ID, 'employment-type')).rejects.toThrow(
        /2 value\(s\) still reference it/,
      );

      expect(definition.deleted).toBe(false);
      expect(definition.save).not.toHaveBeenCalled();
    });

    it('soft-deletes when no values reference the definition', async () => {
      const definition = makeDefinition();
      models.DemographicDefinition.findOne.mockResolvedValue(definition);
      models.DemographicValue.countDocuments.mockReturnValue({
        then: (resolve: any) => Promise.resolve(0).then(resolve),
      });

      await expect(adminService().remove(ORGANIZATION_ID, 'employment-type')).resolves.toBe(true);

      expect(definition.deleted).toBe(true);
      expect(definition.save).toHaveBeenCalledTimes(1);
    });

    it('denies a plain USER before counting values', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(service.remove(ORGANIZATION_ID, 'employment-type')).rejects.toThrow(/permission/i);
      expect(models.DemographicValue.countDocuments).not.toHaveBeenCalled();
    });
  });

  describe('reorder and setEnabled', () => {
    it('applies the supplied order as ordinal', async () => {
      const first = makeDefinition({ key: 'first', ordinal: 9 });
      const second = makeDefinition({ key: 'second', ordinal: 8 });
      const query = makeFindQuery([first, second]);
      models.DemographicDefinition.find.mockReturnValue(query);

      const result = await adminService().reorder(ORGANIZATION_ID, ['second', 'first']);

      expect(first.ordinal).toBe(1);
      expect(second.ordinal).toBe(0);
      expect(first.save).toHaveBeenCalledTimes(1);
      expect(second.save).toHaveBeenCalledTimes(1);
      expect(result.map((definition: any) => definition.key)).toEqual(['second', 'first']);
    });

    it('rejects an unknown key instead of silently ignoring it', async () => {
      models.DemographicDefinition.find.mockReturnValue(makeFindQuery([makeDefinition({ key: 'known' })]));

      await expect(
        adminService().reorder(ORGANIZATION_ID, ['known', 'unknown']),
      ).rejects.toThrow(/not found in organization/);
    });

    it('rejects an empty key list', async () => {
      await expect(adminService().reorder(ORGANIZATION_ID, [])).rejects.toThrow(/at least one/i);
    });

    it('enables and disables a definition', async () => {
      const definition = makeDefinition({ enabled: true });
      models.DemographicDefinition.findOne.mockResolvedValue(definition);

      const result = await adminService().setEnabled(ORGANIZATION_ID, 'employment-type', false);

      expect(result.enabled).toBe(false);
      expect(definition.save).toHaveBeenCalledTimes(1);
    });
  });
});

describe('DemographicsService - policy (ORG-006)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.OrganizationDemographicsPolicy.mockImplementation((doc: any) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(undefined),
    }));
  });

  describe('getPolicy', () => {
    it('returns documented defaults without persisting when no policy exists', async () => {
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue(null);

      const policy: any = await adminService().getPolicy(ORGANIZATION_ID);

      expect(policy).toMatchObject({
        organization: ORGANIZATION_ID,
        selfServiceEnabled: true,
        adminOnlyKeys: [],
        minimumAggregationGroupSize: 5,
        retentionDays: null,
        deleted: false,
      });
      expect(models.OrganizationDemographicsPolicy).not.toHaveBeenCalled();
    });

    it('returns the stored document when one exists', async () => {
      const stored = { organization: ORGANIZATION_ID, selfServiceEnabled: false, adminOnlyKeys: ['x'] };
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue(stored);

      await expect(adminService().getPolicy(ORGANIZATION_ID)).resolves.toBe(stored);
    });
  });

  describe('updatePolicy', () => {
    it('creates the policy on first write with defaults for omitted fields', async () => {
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue(null);

      const policy: any = await adminService().updatePolicy(ORGANIZATION_ID, {
        selfServiceEnabled: false,
      });

      expect(models.OrganizationDemographicsPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: new ObjectId(ORGANIZATION_ID),
          selfServiceEnabled: true, // default, then overwritten below
          adminOnlyKeys: [],
          minimumAggregationGroupSize: 5,
          retentionDays: null,
          deleted: false,
        }),
      );
      expect(policy.selfServiceEnabled).toBe(false);
      expect(policy.save).toHaveBeenCalledTimes(1);
    });

    it('updates an existing policy and leaves unspecified fields untouched', async () => {
      const existing: any = {
        organization: new ObjectId(ORGANIZATION_ID),
        selfServiceEnabled: true,
        adminOnlyKeys: ['employee-number'],
        minimumAggregationGroupSize: 7,
        retentionDays: 90,
        save: jest.fn().mockResolvedValue(undefined),
      };
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue(existing);

      const policy: any = await adminService().updatePolicy(ORGANIZATION_ID, {
        selfServiceEnabled: false,
        adminOnlyKeys: [' Employee-Number ', 'cost-centre', 'cost-centre'],
      });

      expect(policy.selfServiceEnabled).toBe(false);
      expect(policy.adminOnlyKeys).toEqual(['employee-number', 'cost-centre']);
      expect(policy.minimumAggregationGroupSize).toBe(7);
      expect(policy.retentionDays).toBe(90);
      expect(existing.save).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid aggregation group size with a field path', async () => {
      await expect(
        adminService().updatePolicy(ORGANIZATION_ID, { minimumAggregationGroupSize: 0 }),
      ).rejects.toMatchObject({
        meta: {
          fields: [{ path: 'minimumAggregationGroupSize', message: expect.stringMatching(/at least 1/i) }],
        },
      });
    });

    it('rejects an invalid retention period', async () => {
      await expect(
        adminService().updatePolicy(ORGANIZATION_ID, { retentionDays: -1 }),
      ).rejects.toMatchObject({
        meta: { fields: [{ path: 'retentionDays' }] },
      });
    });

    it('denies a plain USER', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(
        service.updatePolicy(ORGANIZATION_ID, { selfServiceEnabled: false }),
      ).rejects.toThrow(/permission/i);
      expect(models.OrganizationDemographicsPolicy.findOne).not.toHaveBeenCalled();
    });
  });
});

describe('DemographicsService - values (ORG-006)', () => {
  let definition: any;

  beforeEach(() => {
    jest.clearAllMocks();
    definition = makeDefinition({ organization: new ObjectId(ORGANIZATION_ID) });
    models.DemographicDefinition.findOne.mockResolvedValue(definition);
    models.DemographicValue.mockImplementation((doc: any) => makeValueDocument(doc));
    models.DemographicValue.findOne.mockResolvedValue(null);
    models.OrganizationDemographicsPolicy.findOne.mockResolvedValue(null);
    models.DemographicValue.deleteOne.mockReturnValue({
      then: (resolve: any) => Promise.resolve({ deletedCount: 1 }).then(resolve),
    });
  });

  describe('saveValue', () => {
    it('writes the caller\'s own value with a key/valueType snapshot', async () => {
      const context = makeContext({ memberOf: [ORGANIZATION_ID] });
      const service = new DemographicsService({}, context);

      const result: any = await service.saveValue(ORGANIZATION_ID, {
        key: 'employment-type',
        value: 'permanent',
      });

      expect(models.DemographicValue).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: new ObjectId(ORGANIZATION_ID),
          user: new ObjectId(`${context.user._id}`),
          definition: definition._id,
          key: 'employment-type',
          valueType: 'enum',
          value: 'permanent',
          source: 'user',
          updatedBy: context.user._id,
        }),
      );
      expect(result.save).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid value with field-level errors', async () => {
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.saveValue(ORGANIZATION_ID, { key: 'employment-type', value: 'permanent-ish' }),
      ).rejects.toMatchObject({
        message: /Invalid value for demographic/,
        meta: {
          key: 'employment-type',
          fields: [
            {
              path: '',
              message: expect.stringMatching(/permanent, contract/),
            },
          ],
        },
      });

      expect(models.DemographicValue).not.toHaveBeenCalled();
    });

    it('rejects a value whose definition belongs to another organization', async () => {
      definition.organization = new ObjectId();

      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.saveValue(ORGANIZATION_ID, { key: 'employment-type', value: 'permanent' }),
      ).rejects.toThrow(/does not belong to organization/);
      expect(models.DemographicValue).not.toHaveBeenCalled();
    });

    it('denies a plain USER writing for somebody else', async () => {
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.saveValue(ORGANIZATION_ID, {
          key: 'employment-type',
          user: `${new ObjectId()}`,
          value: 'permanent',
        }),
      ).rejects.toThrow(/permission/i);
    });

    it('allows an administrator to write for another user and records source admin', async () => {
      const targetUserId = `${new ObjectId()}`;
      const service = adminService();

      await service.saveValue(ORGANIZATION_ID, {
        key: 'employment-type',
        user: targetUserId,
        value: 'contract',
      });

      expect(models.DemographicValue).toHaveBeenCalledWith(
        expect.objectContaining({
          user: new ObjectId(targetUserId),
          source: 'admin',
        }),
      );
    });

    it('rejects writes against a disabled definition for a non-admin', async () => {
      definition.enabled = false;
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.saveValue(ORGANIZATION_ID, { key: 'employment-type', value: 'permanent' }),
      ).rejects.toThrow(/is disabled/);
    });

    it('rejects writes when the organization disables self-service', async () => {
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue({
        organization: ORGANIZATION_ID,
        selfServiceEnabled: false,
        adminOnlyKeys: [],
      });
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.saveValue(ORGANIZATION_ID, { key: 'employment-type', value: 'permanent' }),
      ).rejects.toThrow(/Self-service demographics are disabled/);
    });

    it('rejects writes to an admin-only key for a non-admin', async () => {
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue({
        organization: ORGANIZATION_ID,
        selfServiceEnabled: true,
        adminOnlyKeys: ['employment-type'],
      });
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.saveValue(ORGANIZATION_ID, { key: 'employment-type', value: 'permanent' }),
      ).rejects.toThrow(/only be updated by an organization administrator/);
    });

    it('updates an existing value document instead of creating a second one', async () => {
      const existing = makeValueDocument({
        organization: new ObjectId(ORGANIZATION_ID),
        definition: definition._id,
        value: 'contract',
      });
      models.DemographicValue.findOne.mockResolvedValue(existing);

      const result = await adminService().saveValue(ORGANIZATION_ID, {
        key: 'employment-type',
        value: 'permanent',
        verified: true,
      });

      expect(result).toBe(existing);
      expect(existing.value).toBe('permanent');
      expect(existing.verified).toBe(true);
      expect(existing.save).toHaveBeenCalledTimes(1);
      expect(models.DemographicValue).not.toHaveBeenCalled();
    });
  });

  describe('saveValues (bulk)', () => {
    it('validates the whole batch before writing anything', async () => {
      await expect(
        adminService().saveValues(ORGANIZATION_ID, [
          { key: 'employment-type', value: 'permanent' },
          { key: 'employment-type', value: 'not-an-option' },
        ]),
      ).rejects.toMatchObject({
        meta: {
          fields: [
            { path: 'values[1]', message: expect.stringMatching(/not one of the allowed options/) },
          ],
        },
      });

      expect(models.DemographicValue).not.toHaveBeenCalled();
    });

    it('writes every valid row', async () => {
      const results = await adminService().saveValues(ORGANIZATION_ID, [
        { key: 'employment-type', value: 'permanent' },
        { key: 'employment-type', value: 'contract' },
      ]);

      expect(results).toHaveLength(2);
      expect(models.DemographicValue).toHaveBeenCalledTimes(2);
    });

    it('requires an organization administrator', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(
        service.saveValues(ORGANIZATION_ID, [{ key: 'employment-type', value: 'permanent' }]),
      ).rejects.toThrow(/permission/i);
    });
  });

  describe('getUserValues', () => {
    it('returns the caller\'s own values without administrator rights', async () => {
      const context = makeContext({ memberOf: [ORGANIZATION_ID] });
      const query = makeFindQuery([makeValueDocument()]);
      models.DemographicValue.find.mockReturnValue(query);

      const result = await new DemographicsService({}, context).getUserValues(
        ORGANIZATION_ID,
        `${context.user._id}`,
      );

      expect(result).toHaveLength(1);
      expect(models.DemographicValue.find).toHaveBeenCalledWith({
        organization: new ObjectId(ORGANIZATION_ID),
        user: new ObjectId(`${context.user._id}`),
      });
    });

    it('denies a plain USER reading another user\'s values', async () => {
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.getUserValues(ORGANIZATION_ID, `${new ObjectId()}`),
      ).rejects.toThrow(/permission/i);
      expect(models.DemographicValue.find).not.toHaveBeenCalled();
    });

    it('allows an organization administrator to read another user\'s values', async () => {
      models.DemographicValue.find.mockReturnValue(makeFindQuery([]));
      const service = adminService();

      await expect(
        service.getUserValues(ORGANIZATION_ID, `${new ObjectId()}`),
      ).resolves.toEqual([]);
    });

    it('rejects an invalid user id', async () => {
      const context = makeContext({ memberOf: [ORGANIZATION_ID] });
      const service = new DemographicsService({}, context);

      await expect(
        service.getUserValues(ORGANIZATION_ID, 'not-an-id'),
      ).rejects.toThrow(/not a valid/);
    });
  });

  describe('listValues', () => {
    it('denies a plain USER the organization-wide listing', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(service.listValues(ORGANIZATION_ID, {})).rejects.toThrow(/permission/i);
      expect(models.DemographicValue.find).not.toHaveBeenCalled();
    });

    it('pages and filters for an administrator', async () => {
      const query = makeFindQuery([makeValueDocument()]);
      models.DemographicValue.find.mockReturnValue(query);
      models.DemographicValue.countDocuments.mockReturnValue({
        then: (resolve: any) => Promise.resolve(41).then(resolve),
      });

      const result = await adminService().listValues(
        ORGANIZATION_ID,
        { key: 'Employment-Type', verified: true },
        { page: 2, pageSize: 20 },
      );

      expect(models.DemographicValue.find).toHaveBeenCalledWith({
        organization: new ObjectId(ORGANIZATION_ID),
        key: 'employment-type',
        verified: true,
      });
      expect(query.skip).toHaveBeenCalledWith(20);
      expect(query.limit).toHaveBeenCalledWith(20);
      expect(result.paging).toEqual({ page: 2, pageSize: 20, total: 41, hasNext: true });
    });

    it('rejects an invalid filter id', async () => {
      await expect(
        adminService().listValues(ORGANIZATION_ID, { user: 'nope' }),
      ).rejects.toThrow(/not a valid/);
    });
  });

  describe('deleteValue', () => {
    it('deletes the caller\'s own value', async () => {
      const context = makeContext({ memberOf: [ORGANIZATION_ID] });
      const service = new DemographicsService({}, context);

      await expect(service.deleteValue(ORGANIZATION_ID, 'employment-type')).resolves.toBe(true);

      expect(models.DemographicValue.deleteOne).toHaveBeenCalledWith({
        organization: new ObjectId(ORGANIZATION_ID),
        definition: definition._id,
        user: new ObjectId(`${context.user._id}`),
      });
    });

    it('denies a plain USER deleting somebody else\'s value', async () => {
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.deleteValue(ORGANIZATION_ID, 'employment-type', `${new ObjectId()}`),
      ).rejects.toThrow(/permission/i);
      expect(models.DemographicValue.deleteOne).not.toHaveBeenCalled();
    });

    it('allows an administrator to delete another user\'s value', async () => {
      const targetUserId = `${new ObjectId()}`;

      await expect(
        adminService().deleteValue(ORGANIZATION_ID, 'employment-type', targetUserId),
      ).resolves.toBe(true);

      expect(models.DemographicValue.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({ user: new ObjectId(targetUserId) }),
      );
    });

    it('returns false when there was no value to delete', async () => {
      models.DemographicValue.deleteOne.mockReturnValue({
        then: (resolve: any) => Promise.resolve({ deletedCount: 0 }).then(resolve),
      });

      await expect(
        new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] })).deleteValue(ORGANIZATION_ID, 'employment-type'),
      ).resolves.toBe(false);
    });

    it('refuses when self-service is disabled', async () => {
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue({
        organization: ORGANIZATION_ID,
        selfServiceEnabled: false,
        adminOnlyKeys: [],
      });
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.deleteValue(ORGANIZATION_ID, 'employment-type'),
      ).rejects.toThrow(/Self-service demographics are disabled/);
    });
  });

  describe('saveSelfServiceValues (MySaveDemographics)', () => {
    it('writes for the caller and records the supplied membership', async () => {
      const context = makeContext({ memberOf: [ORGANIZATION_ID] });
      const membershipId = `${new ObjectId()}`;

      const result = await new DemographicsService({}, context).saveSelfServiceValues(
        ORGANIZATION_ID,
        [{ key: 'employment-type', value: 'permanent' }],
        membershipId,
      );

      expect(result).toHaveLength(1);
      expect(models.DemographicValue).toHaveBeenCalledWith(
        expect.objectContaining({
          user: new ObjectId(`${context.user._id}`),
          membership: new ObjectId(membershipId),
          source: 'user',
        }),
      );
    });

    it('rejects a payload that names another user', async () => {
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.saveSelfServiceValues(ORGANIZATION_ID, [
          { key: 'employment-type', user: `${new ObjectId()}`, value: 'permanent' },
        ]),
      ).rejects.toThrow(/only write values for the authenticated user/);

      expect(models.DemographicValue).not.toHaveBeenCalled();
    });

    it('refuses when self-service is disabled', async () => {
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue({
        organization: ORGANIZATION_ID,
        selfServiceEnabled: false,
        adminOnlyKeys: [],
      });
      const service = new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] }));

      await expect(
        service.saveSelfServiceValues(ORGANIZATION_ID, [
          { key: 'employment-type', value: 'permanent' },
        ]),
      ).rejects.toThrow(/Self-service demographics are disabled/);

      expect(models.DemographicValue).not.toHaveBeenCalled();
    });

    it('rejects an admin-only key with a field-level error', async () => {
      models.OrganizationDemographicsPolicy.findOne.mockResolvedValue({
        organization: ORGANIZATION_ID,
        selfServiceEnabled: true,
        adminOnlyKeys: ['employment-type'],
      });

      await expect(
        new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] })).saveSelfServiceValues(ORGANIZATION_ID, [
          { key: 'employment-type', value: 'permanent' },
        ]),
      ).rejects.toMatchObject({
        meta: {
          fields: [
            {
              path: 'values[0].key',
              message: expect.stringMatching(/only be updated by an organization administrator/),
            },
          ],
        },
      });
    });

    it('rejects a non-user source', async () => {
      await expect(
        new DemographicsService({}, makeContext({ memberOf: [ORGANIZATION_ID] })).saveSelfServiceValues(ORGANIZATION_ID, [
          { key: 'employment-type', value: 'permanent', source: 'admin' },
        ]),
      ).rejects.toThrow(/cannot set the value source/);
    });
  });

  describe('organization membership is required for every value operation', () => {
    it('denies a non-member reading their own values', async () => {
      const service = new DemographicsService({}, makeContext({}));
      const callerId = `${makeContext({}).user._id}`;

      await expect(service.getUserValues(ORGANIZATION_ID, callerId)).rejects.toThrow(
        /permission to access organization/i,
      );
      expect(models.DemographicValue.find).not.toHaveBeenCalled();
    });

    it('denies a non-member writing their own value', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(
        service.saveValue(ORGANIZATION_ID, { key: 'employment-type', value: 'permanent' }),
      ).rejects.toThrow(/permission to access organization/i);
      expect(models.DemographicDefinition.findOne).not.toHaveBeenCalled();
    });

    it('denies a non-member deleting their own value', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(service.deleteValue(ORGANIZATION_ID, 'employment-type')).rejects.toThrow(
        /permission to access organization/i,
      );
      expect(models.DemographicValue.deleteOne).not.toHaveBeenCalled();
    });

    it('denies a non-member the self-service write path', async () => {
      const service = new DemographicsService({}, makeContext({}));

      await expect(
        service.saveSelfServiceValues(ORGANIZATION_ID, [
          { key: 'employment-type', value: 'permanent' },
        ]),
      ).rejects.toThrow(/permission to access organization/i);
      expect(models.DemographicValue).not.toHaveBeenCalled();
    });

    it('counts a business-unit membership as membership but not as administration', async () => {
      const context = makeContext({});
      context.user.memberships = [
        {
          clientId: context.partner._id,
          organizationId: new ObjectId(ORGANIZATION_ID),
          businessUnitId: new ObjectId(),
          roles: ['USER'],
          enabled: true,
        },
      ];

      models.DemographicValue.find.mockReturnValue(makeFindQuery([]));
      const service = new DemographicsService({}, context);

      await expect(
        service.getUserValues(ORGANIZATION_ID, `${context.user._id}`),
      ).resolves.toEqual([]);

      // Administration stays organization-level only.
      await expect(
        service.listValues(ORGANIZATION_ID, {}),
      ).rejects.toThrow(/permission/i);
    });
  });
});

describe('DemographicsService - org-scoped guard rails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const assertOrgAdmin = (service: any, organizationId: any, context: any) =>
    service.assertOrgAdmin(organizationId, context);

  it('denies a user document without an id', () => {
    const context: any = {
      user: { hasRole: jest.fn(() => true), memberships: [] },
      partner: { _id: new ObjectId() },
      hasRole: jest.fn(() => true),
      log: jest.fn(),
    };

    expect(() => assertOrgAdmin(adminService(), ORGANIZATION_ID, context)).toThrow(
      /authenticated/i,
    );
  });

  it('denies a caller with no partner context', () => {
    const context = makeContext({ admin: true });
    context.partner = null;

    expect(() => assertOrgAdmin(adminService(), ORGANIZATION_ID, context)).toThrow(/partner/i);
  });

  it('rejects an invalid organization id', () => {
    const context = makeContext({ admin: true });

    expect(() => assertOrgAdmin(adminService(), 'not-an-object-id', context)).toThrow(
      /not a valid/,
    );
  });

  it('grants nothing to a business-unit membership', () => {
    const context = makeContext({ orgAdminOf: [ORGANIZATION_ID] });
    context.user.memberships = [
      {
        clientId: context.partner._id,
        organizationId: new ObjectId(ORGANIZATION_ID),
        businessUnitId: new ObjectId(),
        roles: ['USER', 'ORGANIZATION_ADMIN'],
        enabled: true,
      },
    ];

    expect(() => assertOrgAdmin(adminService(), ORGANIZATION_ID, context)).toThrow(/permission/i);
  });

  it('grants nothing to a disabled membership', () => {
    const context = makeContext({ orgAdminOf: [ORGANIZATION_ID] });
    context.user.memberships = [
      {
        clientId: context.partner._id,
        organizationId: new ObjectId(ORGANIZATION_ID),
        businessUnitId: null,
        roles: ['USER', 'ORGANIZATION_ADMIN'],
        enabled: false,
      },
    ];

    expect(() => assertOrgAdmin(adminService(), ORGANIZATION_ID, context)).toThrow(/permission/i);
  });
});
