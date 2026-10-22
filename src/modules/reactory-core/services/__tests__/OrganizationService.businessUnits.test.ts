/**
 * Business unit management on OrganizationService (ORG-020).
 *
 * Named after the source file it exercises: there is no BusinessUnitService;
 * the business unit surface is part of OrganizationService.
 */
import { ObjectId } from 'mongodb';
import { OrganizationService } from '../OrganizationService';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const Team: any = jest.fn();
  Team.count = jest.fn();
  Team.find = jest.fn();
  Team.findById = jest.fn();
  Team.countDocuments = jest.fn();

  const Organization: any = jest.fn();
  Organization.findById = jest.fn();
  Organization.findOne = jest.fn();
  Organization.count = jest.fn();
  Organization.countDocuments = jest.fn();
  Organization.find = jest.fn();

  const BusinessUnit: any = jest.fn();
  BusinessUnit.find = jest.fn();
  BusinessUnit.findOne = jest.fn();
  BusinessUnit.findById = jest.fn();
  BusinessUnit.findByOrganization = jest.fn();
  BusinessUnit.count = jest.fn();
  BusinessUnit.countDocuments = jest.fn();
  BusinessUnit.findByIdAndUpdate = jest.fn();
  BusinessUnit.findOneAndUpdate = jest.fn();
  BusinessUnit.findByIdAndDelete = jest.fn();
  BusinessUnit.deleteOne = jest.fn();
  BusinessUnit.deleteMany = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();
  User.countDocuments = jest.fn();

  const Organigram: any = jest.fn();
  Organigram.findOne = jest.fn();

  return { Team, Organization, BusinessUnit, User, Organigram };
});

const models = require('@reactory/server-modules/reactory-core/models');

/**
 * The REAL `User` model, so the org-scoped check runs against the shipped
 * `hasRole` implementation (which falls back to document-level roles) rather
 * than a mock that encodes the intended semantics.
 */
const RealUserModel = jest.requireActual(
  '@reactory/server-modules/reactory-core/models/User',
).default;

interface IRolePolicy {
  admin?: boolean;
  system?: boolean;
  orgAdminOf?: string[];
}

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

/**
 * A mongoose-like query stub. `BusinessUnit.find(...)` is awaited after
 * `.sort().skip().limit()`, exactly like the service calls it.
 */
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

const makeBusinessUnit = (overrides: Record<string, any> = {}): any => ({
  _id: new ObjectId(),
  name: 'Engineering',
  description: 'Builds and ships the platform',
  avatar: 'engineering.png',
  organization: new ObjectId(),
  owner: new ObjectId(),
  members: [],
  deleted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const expectRejection = async (call: () => Promise<any>, matcher: RegExp): Promise<void> => {
  await expect(Promise.resolve().then(call)).rejects.toThrow(matcher);
};

describe('OrganizationService business unit management (ORG-020)', () => {
  let organizationA: ObjectId;
  let organizationB: ObjectId;
  let businessUnit: any;
  let service: OrganizationService;

  const serviceFor = (policy: IRolePolicy) => new OrganizationService({}, makeContext(policy));

  beforeEach(() => {
    jest.clearAllMocks();

    organizationA = new ObjectId();
    organizationB = new ObjectId();
    businessUnit = makeBusinessUnit({ organization: organizationA });

    models.Organization.countDocuments.mockResolvedValue(1);
    models.Organization.findById.mockResolvedValue(null);
    models.BusinessUnit.findById.mockResolvedValue(businessUnit);
    models.BusinessUnit.find.mockImplementation(() => queryChain([]));
    models.BusinessUnit.countDocuments.mockResolvedValue(0);
    models.Organigram.findOne.mockResolvedValue(null);

    service = serviceFor({ orgAdminOf: [`${organizationA}`] });
  });

  describe('updateBusinessUnit', () => {
    it('persists name, description, avatar and owner', async () => {
      const newOwner = new ObjectId();

      const result = await service.updateBusinessUnit(`${businessUnit._id}`, {
        name: '  Platform Engineering  ',
        description: 'Owns the runtime',
        avatar: 'platform.png',
        owner: `${newOwner}`,
      });

      expect(result).toBe(businessUnit);
      expect(businessUnit.name).toBe('Platform Engineering');
      expect(businessUnit.description).toBe('Owns the runtime');
      expect(businessUnit.avatar).toBe('platform.png');
      expect(businessUnit.owner.toString()).toBe(newOwner.toString());
      expect(businessUnit.save).toHaveBeenCalledTimes(1);
      expect(businessUnit.updatedBy.toString()).toBe(`${service.getExecutionContext().user._id}`);
    });

    it('clears description, avatar and owner when null or blank', async () => {
      await service.updateBusinessUnit(`${businessUnit._id}`, {
        description: null,
        avatar: '   ',
        owner: null,
      } as any);

      expect(businessUnit.name).toBe('Engineering');
      expect(businessUnit.description).toBeNull();
      expect(businessUnit.avatar).toBeNull();
      expect(businessUnit.owner).toBeNull();
      expect(businessUnit.save).toHaveBeenCalledTimes(1);
    });

    it('leaves omitted fields untouched', async () => {
      const originalOwner = `${businessUnit.owner}`;

      await service.updateBusinessUnit(`${businessUnit._id}`, { name: 'Renamed' });

      expect(businessUnit.name).toBe('Renamed');
      expect(businessUnit.description).toBe('Builds and ships the platform');
      expect(businessUnit.avatar).toBe('engineering.png');
      expect(businessUnit.owner.toString()).toBe(originalOwner);
    });

    it('rejects clearing the name', async () => {
      await expect(
        service.updateBusinessUnit(`${businessUnit._id}`, { name: '   ' })
      ).rejects.toThrow('Business Unit name cannot be empty');

      expect(businessUnit.name).toBe('Engineering');
      expect(businessUnit.save).not.toHaveBeenCalled();
    });

    it('rejects an invalid owner id', async () => {
      await expect(
        service.updateBusinessUnit(`${businessUnit._id}`, { owner: 'not-an-object-id' })
      ).rejects.toThrow('owner is not a valid user id');

      expect(businessUnit.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown business unit', async () => {
      models.BusinessUnit.findById.mockResolvedValue(null);

      await expect(
        service.updateBusinessUnit(`${new ObjectId()}`, { name: 'Ghost' })
      ).rejects.toThrow('could not be found');
    });

    it('rejects renaming to a name already used in the same organization', async () => {
      models.BusinessUnit.countDocuments.mockResolvedValue(1);

      await expect(
        service.updateBusinessUnit(`${businessUnit._id}`, { name: 'Operations' })
      ).rejects.toThrow('already exists in organization');

      expect(businessUnit.name).toBe('Engineering');
      expect(businessUnit.save).not.toHaveBeenCalled();
    });

    it('scopes the rename check to the same organization and ignores deleted units', async () => {
      await service.updateBusinessUnit(`${businessUnit._id}`, { name: 'Operations' });

      const renameQuery = models.BusinessUnit.countDocuments.mock.calls[0][0];
      expect(renameQuery.organization.toString()).toBe(organizationA.toString());
      expect(renameQuery._id).toEqual({ $ne: businessUnit._id });
      expect(renameQuery.deleted).toEqual({ $ne: true });
      expect(renameQuery.name).toEqual({ $regex: '^Operations$', $options: 'i' });
    });

    it('does not re-check uniqueness when the name is unchanged', async () => {
      await service.updateBusinessUnit(`${businessUnit._id}`, { name: 'engineering' });

      expect(models.BusinessUnit.countDocuments).not.toHaveBeenCalled();
    });

    it('ignores a members payload: membership is not writable through update', async () => {
      const originalMembers = [new ObjectId()];
      businessUnit.members = originalMembers;

      await service.updateBusinessUnit(`${businessUnit._id}`, {
        name: 'Renamed',
        members: [new ObjectId()],
      } as any);

      expect(businessUnit.members).toBe(originalMembers);
    });

    it('does not fall back to the deprecated findByIdAndUpdate path', async () => {
      await service.updateBusinessUnit(`${businessUnit._id}`, { description: 'Updated' });

      expect(models.BusinessUnit.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('deleteBusinessUnit / restoreBusinessUnit', () => {
    it('soft deletes by setting the deleted flag', async () => {
      const result = await service.deleteBusinessUnit(`${businessUnit._id}`);

      expect(result).toBe(businessUnit);
      expect(businessUnit.deleted).toBe(true);
      expect(businessUnit.save).toHaveBeenCalledTimes(1);
      // Never hard delete.
      expect(models.BusinessUnit.findByIdAndDelete).not.toHaveBeenCalled();
      expect(models.BusinessUnit.deleteOne).not.toHaveBeenCalled();
      expect(models.BusinessUnit.deleteMany).not.toHaveBeenCalled();
    });

    it('restores a soft-deleted business unit', async () => {
      businessUnit.deleted = true;

      const result = await service.restoreBusinessUnit(`${businessUnit._id}`);

      expect(result).toBe(businessUnit);
      expect(businessUnit.deleted).toBe(false);
      expect(businessUnit.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('pagedBusinessUnits', () => {
    it('excludes soft-deleted business units by default', async () => {
      const units = [makeBusinessUnit({ organization: organizationA })];
      models.BusinessUnit.find.mockImplementation(() => queryChain(units));
      models.BusinessUnit.countDocuments.mockResolvedValue(1);

      const result = await service.pagedBusinessUnits(`${organizationA}`, {}, { page: 1, pageSize: 25 });

      const dbQuery = models.BusinessUnit.find.mock.calls[0][0];
      expect(dbQuery.organization.toString()).toBe(organizationA.toString());
      expect(dbQuery.deleted).toEqual({ $ne: true });
      expect(result.businessUnits).toBe(units);
    });

    it('includes deleted business units when includeDeleted is set', async () => {
      await service.pagedBusinessUnits(`${organizationA}`, { includeDeleted: true } as any);

      const dbQuery = models.BusinessUnit.find.mock.calls[0][0];
      expect(dbQuery.deleted).toBeUndefined();
    });

    it('returns only deleted business units when deletedOnly is set', async () => {
      await service.pagedBusinessUnits(`${organizationA}`, { deletedOnly: true } as any);

      const dbQuery = models.BusinessUnit.find.mock.calls[0][0];
      expect(dbQuery.deleted).toBe(true);
    });

    it('filters by search across name and description, escaping the term', async () => {
      await service.pagedBusinessUnits(`${organizationA}`, { search: 'R&D (core).' } as any);

      const dbQuery = models.BusinessUnit.find.mock.calls[0][0];
      expect(dbQuery.$or).toEqual([
        { name: { $regex: 'R&D \\(core\\)\\.', $options: 'i' } },
        { description: { $regex: 'R&D \\(core\\)\\.', $options: 'i' } },
      ]);
    });

    it('returns the paged envelope used by CorePagedOrganizations', async () => {
      models.BusinessUnit.countDocuments.mockResolvedValue(12);
      models.BusinessUnit.find.mockImplementation(() => queryChain([makeBusinessUnit()]));

      const result = await service.pagedBusinessUnits(
        `${organizationA}`,
        {},
        { page: 2, pageSize: 5 } as any
      );

      expect(result.paging).toMatchObject({
        page: 2,
        pageSize: 5,
        total: 12,
        hasNext: true,
      });
      expect(models.BusinessUnit.find.mock.results[0].value.skip).toHaveBeenCalledWith(5);
      expect(models.BusinessUnit.find.mock.results[0].value.limit).toHaveBeenCalledWith(5);
    });

    it('defaults to page 1 and a page size of 25', async () => {
      const result = await service.pagedBusinessUnits(`${organizationA}`);

      expect(result.paging.page).toBe(1);
      expect(result.paging.pageSize).toBe(25);
    });

    it('rejects an unknown organization', async () => {
      models.Organization.countDocuments.mockResolvedValue(0);

      await expect(
        service.pagedBusinessUnits(`${organizationA}`)
      ).rejects.toThrow('could not be found');
    });

    it('rejects an invalid organization id', async () => {
      await expect(
        service.pagedBusinessUnits('not-an-object-id')
      ).rejects.toThrow('is not a valid');
    });
  });

  describe('org-scoped authorization', () => {
    it('denies an ORGANIZATION_ADMIN of organization B mutating a unit in organization A', async () => {
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.updateBusinessUnit(`${businessUnit._id}`, { name: 'Hijacked' }),
        /permission/i
      );

      expect(businessUnit.name).toBe('Engineering');
      expect(businessUnit.save).not.toHaveBeenCalled();
    });

    it('denies an ORGANIZATION_ADMIN of organization B deleting a unit in organization A', async () => {
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.deleteBusinessUnit(`${businessUnit._id}`),
        /permission/i
      );

      expect(businessUnit.deleted).toBe(false);
      expect(businessUnit.save).not.toHaveBeenCalled();
    });

    it('denies an ORGANIZATION_ADMIN of organization B restoring a unit in organization A', async () => {
      businessUnit.deleted = true;
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.restoreBusinessUnit(`${businessUnit._id}`),
        /permission/i
      );

      expect(businessUnit.deleted).toBe(true);
      expect(businessUnit.save).not.toHaveBeenCalled();
    });

    it('denies a plain USER', async () => {
      const plainUser = serviceFor({});

      await expectRejection(
        () => plainUser.updateBusinessUnit(`${businessUnit._id}`, { name: 'Nope' }),
        /permission/i
      );

      expect(businessUnit.save).not.toHaveBeenCalled();
    });

    it('allows a platform ADMIN on any organization', async () => {
      const admin = serviceFor({ admin: true });

      await admin.updateBusinessUnit(`${businessUnit._id}`, { description: 'Admin edit' });

      expect(businessUnit.description).toBe('Admin edit');
      expect(businessUnit.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('membership mutations', () => {
    it('adds a member and never leaves the array with a duplicate', async () => {
      const member: any = { _id: new ObjectId() };
      models.User.findById.mockResolvedValue(member);

      await service.addMemberToBusinessUnit(`${businessUnit._id}`, `${member._id}`);
      await service.addMemberToBusinessUnit(`${businessUnit._id}`, `${member._id}`);

      expect(businessUnit.members).toHaveLength(1);
      expect(`${businessUnit.members[0]}`).toBe(`${member._id}`);
      expect(businessUnit.save).toHaveBeenCalledTimes(2);
    });

    it('removes a member', async () => {
      const member: any = { _id: new ObjectId() };
      businessUnit.members = [member._id];
      models.User.findById.mockResolvedValue(member);

      await service.removeMemberFromBusinessUnit(`${businessUnit._id}`, `${member._id}`);

      expect(businessUnit.members).toHaveLength(0);
      expect(businessUnit.save).toHaveBeenCalledTimes(1);
    });

    it('denies an ORGANIZATION_ADMIN of another organization adding a member', async () => {
      const member: any = { _id: new ObjectId() };
      models.User.findById.mockResolvedValue(member);
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.addMemberToBusinessUnit(`${businessUnit._id}`, `${member._id}`),
        /permission/i
      );

      expect(businessUnit.members).toHaveLength(0);
      expect(businessUnit.save).not.toHaveBeenCalled();
    });
  });
});
