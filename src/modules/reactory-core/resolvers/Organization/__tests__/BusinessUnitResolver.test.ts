import { ObjectId } from 'mongodb';
import BusinessUnitResolver from '../BusinessUnitResolver';
import OrganizationResolver from '../Organization';
import { mergeGraphResolver } from '@reactory/server-core/utils';

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const Organization: any = jest.fn();
  Organization.findById = jest.fn();

  const BusinessUnit: any = jest.fn();
  BusinessUnit.find = jest.fn();
  BusinessUnit.findById = jest.fn();
  BusinessUnit.countDocuments = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();

  return { Organization, BusinessUnit, User };
});

const models = require('@reactory/server-modules/reactory-core/models');

/**
 * `MergeGraphResolvers` harvests the decorated methods from the class
 * prototype into a plain map, so the tests call the harvested functions the
 * same way the GraphQL layer does.
 */
const harvest = (): any => {
  const instance: any = Object.create((BusinessUnitResolver as any).prototype);
  const map = instance.resolver;
  return {
    Query: { ...map.Query },
    Mutation: { ...map.Mutation },
  };
};

const queryChain = (result: any[]) => {
  const chain: any = {
    sort: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return chain;
};

const makeContext = (roles: string[] = ['USER']) => {
  const service = {
    updateBusinessUnit: jest.fn().mockResolvedValue({ _id: 'bu-1', name: 'Renamed' }),
    deleteBusinessUnit: jest.fn().mockResolvedValue({ _id: 'bu-1', deleted: true }),
    restoreBusinessUnit: jest.fn().mockResolvedValue({ _id: 'bu-1', deleted: false }),
    pagedBusinessUnits: jest.fn().mockResolvedValue({
      paging: { page: 1, pageSize: 25, total: 0, hasNext: false },
      businessUnits: [],
    }),
    addMemberToBusinessUnit: jest.fn().mockResolvedValue(true),
    removeMemberFromBusinessUnit: jest.fn().mockResolvedValue(true),
  };

  const context: any = {
    user: { _id: new ObjectId(), email: 'admin@reactory.net' },
    partner: { _id: new ObjectId() },
    hasRole: jest.fn((role: string) => roles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => roles.length > 0),
    getService: jest.fn(() => service),
    log: jest.fn(),
  };

  return { context, service };
};

describe('BusinessUnitResolver (ORG-020)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges into the core resolver map without clobbering organization resolvers', () => {
    const merged: any = mergeGraphResolver([BusinessUnitResolver]);

    expect(merged.Mutation.updateBusinessUnit).toBeDefined();
    expect(merged.Mutation.deleteBusinessUnit).toBeDefined();
    expect(merged.Mutation.restoreBusinessUnit).toBeDefined();
    // The typo'd alias must survive.
    expect(merged.Mutation.addMemberToBussinessUnit).toBeDefined();
    expect(merged.Mutation.addMemberToBusinessUnit).toBeDefined();
    expect(merged.Mutation.removeMemberFromBusinessUnit).toBeDefined();
    expect(merged.Query.pagedBusinessUnits).toBeDefined();
    expect(merged.Query.ReactoryBusinessUnits).toBeDefined();
    expect(merged.BusinessUnit.members).toBeDefined();
  });

  describe('mutations delegate to the service', () => {
    it('forwards updateBusinessUnit with the caller context', async () => {
      const map = harvest();
      const { context, service } = makeContext(['ORGANIZATION_ADMIN']);
      const input = { name: 'Renamed' };

      const result = await map.Mutation.updateBusinessUnit({}, { id: 'bu-1', input }, context);

      expect(service.updateBusinessUnit).toHaveBeenCalledWith('bu-1', input, context);
      expect(result).toEqual({ _id: 'bu-1', name: 'Renamed' });
    });

    it('forwards deleteBusinessUnit and restoreBusinessUnit', async () => {
      const map = harvest();
      const { context, service } = makeContext(['ORGANIZATION_ADMIN']);

      await map.Mutation.deleteBusinessUnit({}, { id: 'bu-1' }, context);
      await map.Mutation.restoreBusinessUnit({}, { id: 'bu-1' }, context);

      expect(service.deleteBusinessUnit).toHaveBeenCalledWith('bu-1', context);
      expect(service.restoreBusinessUnit).toHaveBeenCalledWith('bu-1', context);
    });

    it('keeps the typo\'d addMemberToBussinessUnit alias working', async () => {
      const map = harvest();
      const { context, service } = makeContext(['ORGANIZATION_ADMIN']);

      const result = await map.Mutation.addMemberToBussinessUnit(
        {},
        { id: 'bu-1', memberId: 'user-1' },
        context,
      );

      expect(result).toBe(true);
      expect(service.addMemberToBusinessUnit).toHaveBeenCalledWith('bu-1', 'user-1', context);
    });

    it('forwards removeMemberFromBusinessUnit', async () => {
      const map = harvest();
      const { context, service } = makeContext(['ORGANIZATION_ADMIN']);

      await map.Mutation.removeMemberFromBusinessUnit(
        {},
        { id: 'bu-1', memberId: 'user-1' },
        context,
      );

      expect(service.removeMemberFromBusinessUnit).toHaveBeenCalledWith('bu-1', 'user-1', context);
    });

    it('rejects callers without a privileged role before touching the service', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      await expect(
        Promise.resolve().then(() =>
          map.Mutation.updateBusinessUnit({}, { id: 'bu-1', input: { name: 'Nope' } }, context),
        ),
      ).rejects.toThrow(/permissions/i);

      expect(service.updateBusinessUnit).not.toHaveBeenCalled();
    });
  });

  describe('queries', () => {
    it('forwards pagedBusinessUnits', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);
      const filter = { search: 'eng' };
      const paging = { page: 1, pageSize: 10 };

      const result = await map.Query.pagedBusinessUnits(
        {},
        { organizationId: 'org-1', filter, paging },
        context,
      );

      expect(service.pagedBusinessUnits).toHaveBeenCalledWith('org-1', filter, paging);
      expect(result.paging.total).toBe(0);
    });

    it('escapes the searchString in businessUnitsForOrganization', async () => {
      const map = harvest();
      const organizationId = new ObjectId();
      models.Organization.findById.mockResolvedValue({ _id: organizationId });
      models.BusinessUnit.find.mockImplementation(() => queryChain([]));

      await map.Query.businessUnitsForOrganization(
        {},
        { id: `${organizationId}`, searchString: 'R&D (core)' },
        {},
      );

      const dbQuery = models.BusinessUnit.find.mock.calls[0][0];
      expect(dbQuery.name).toEqual({ $regex: 'R&D \\(core\\)', $options: 'i' });
      expect(() => new RegExp(dbQuery.name.$regex)).not.toThrow();
    });

    it('excludes soft-deleted units from businessUnitsForOrganization', async () => {
      const map = harvest();
      const organizationId = new ObjectId();
      models.Organization.findById.mockResolvedValue({ _id: organizationId });
      models.BusinessUnit.find.mockImplementation(() => queryChain([]));

      await map.Query.businessUnitsForOrganization({}, { id: `${organizationId}` }, {});

      const dbQuery = models.BusinessUnit.find.mock.calls[0][0];
      expect(dbQuery.deleted).toEqual({ $ne: true });
      expect(dbQuery.organization.toString()).toBe(organizationId.toString());
    });

    it('excludes soft-deleted units from ReactoryBusinessUnits by default', async () => {
      const map = harvest();
      models.BusinessUnit.find.mockImplementation(() => queryChain([]));
      models.BusinessUnit.countDocuments.mockResolvedValue(0);

      const result = await map.Query.ReactoryBusinessUnits({}, { query: { filter: {} } });

      const dbQuery = models.BusinessUnit.find.mock.calls[0][0];
      expect(dbQuery.deleted).toEqual({ $ne: true });
      expect(result.__typename).toBe('ReactoryPagedBusinessUnits');
    });

    it('returns only deleted units from ReactoryBusinessUnits when deletedOnly is set', async () => {
      const map = harvest();
      models.BusinessUnit.find.mockImplementation(() => queryChain([]));
      models.BusinessUnit.countDocuments.mockResolvedValue(0);

      await map.Query.ReactoryBusinessUnits(
        {},
        { query: { filter: { deletedOnly: true, includeDeleted: true } } },
      );

      const dbQuery = models.BusinessUnit.find.mock.calls[0][0];
      expect(dbQuery.deleted).toBe(true);
    });

    it('excludes soft-deleted units from the Organization.businessUnits property', async () => {
      const merged: any = mergeGraphResolver([BusinessUnitResolver, OrganizationResolver]);
      const kept = { _id: new ObjectId(), name: 'Kept', deleted: false };
      const removed = { _id: new ObjectId(), name: 'Removed', deleted: true };

      const result = await merged.Organization.businessUnits(
        { _id: new ObjectId(), businessUnits: [kept, removed] },
        {},
        {},
      );

      expect(result).toEqual([kept]);
    });

    it('returns the cached business unit array by identity when nothing is deleted', async () => {
      const merged: any = mergeGraphResolver([BusinessUnitResolver, OrganizationResolver]);
      const businessUnits = [{ _id: new ObjectId(), name: 'Engineering', deleted: false }];

      const result = await merged.Organization.businessUnits(
        { _id: new ObjectId(), businessUnits },
        {},
        {},
      );

      // The resolver's contract is to hand back the already-populated array
      // without querying; DemographicResolver.test.ts pins this identity.
      expect(result).toBe(businessUnits);
      expect(models.BusinessUnit.find).not.toHaveBeenCalled();
    });
  });
});
