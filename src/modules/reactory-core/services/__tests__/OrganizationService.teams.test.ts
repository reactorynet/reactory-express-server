/**
 * Team management on OrganizationService (ORG-021).
 *
 * Named after the source file it exercises: there is no TeamService; the team
 * surface is part of OrganizationService.
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
  BusinessUnit.count = jest.fn();
  BusinessUnit.countDocuments = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();

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
 * A mongoose-like query stub. `Team.find(...)` is awaited after
 * `.populate().populate().sort().skip().limit()`, exactly like the service calls
 * it.
 */
const queryChain = (result: any[]) => {
  const chain: any = {
    populate: jest.fn(() => chain),
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
  organization: new ObjectId(),
  members: [],
  deleted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeTeam = (overrides: Record<string, any> = {}): any => ({
  _id: new ObjectId(),
  name: 'Platform',
  title: 'Platform',
  description: 'Owns the runtime',
  avatar: 'platform.png',
  organization: new ObjectId(),
  businessUnit: null,
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

describe('OrganizationService team management (ORG-021)', () => {
  let organizationA: ObjectId;
  let organizationB: ObjectId;
  let team: any;
  let businessUnitA: any;
  let businessUnitB: any;
  let service: OrganizationService;
  let serviceFor: (policy: IRolePolicy) => OrganizationService;

  beforeEach(() => {
    jest.clearAllMocks();

    organizationA = new ObjectId();
    organizationB = new ObjectId();
    team = makeTeam({ organization: organizationA });
    businessUnitA = makeBusinessUnit({ name: 'Engineering', organization: organizationA });
    businessUnitB = makeBusinessUnit({ name: 'Operations', organization: organizationB });

    const units: Record<string, any> = {
      [`${businessUnitA._id}`]: businessUnitA,
      [`${businessUnitB._id}`]: businessUnitB,
    };

    models.Team.findById.mockResolvedValue(team);
    models.Team.find.mockImplementation(() => queryChain([]));
    models.Team.countDocuments.mockResolvedValue(0);
    models.Team.count.mockResolvedValue(0);
    models.BusinessUnit.findById.mockImplementation((id: any) =>
      Promise.resolve(units[`${id}`] || null),
    );
    models.BusinessUnit.countDocuments.mockResolvedValue(0);
    models.Organization.countDocuments.mockResolvedValue(1);
    models.Organization.findById.mockResolvedValue(null);
    models.Organigram.findOne.mockResolvedValue(null);
    models.User.findById.mockResolvedValue(null);

    serviceFor = (policy: IRolePolicy) => new OrganizationService({}, makeContext(policy));
    service = serviceFor({ orgAdminOf: [`${organizationA}`] });
  });

  describe('createTeam', () => {
    let savedTeams: any[];
    let organization: any;

    beforeEach(() => {
      savedTeams = [];
      models.Team.mockImplementation((doc: any) => {
        const created = { ...doc, save: jest.fn().mockResolvedValue(undefined) };
        savedTeams.push(created);
        return created;
      });

      organization = {
        _id: organizationA,
        teams: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      models.Organization.findById.mockResolvedValue(organization);
    });

    it('persists a business unit that belongs to the same organization', async () => {
      await service.createTeam(`${organizationA}`, 'Engineering', undefined, `${businessUnitA._id}`);

      expect(savedTeams).toHaveLength(1);
      expect(savedTeams[0].businessUnit.toString()).toBe(businessUnitA._id.toString());
      expect(savedTeams[0].organization.toString()).toBe(organizationA.toString());
    });

    it('leaves businessUnit unset when it is omitted', async () => {
      await service.createTeam(`${organizationA}`, 'Engineering');

      expect(savedTeams).toHaveLength(1);
      expect(savedTeams[0].businessUnit).toBeUndefined();
    });

    it('rejects a business unit from another organization', async () => {
      await expectRejection(
        () => service.createTeam(`${organizationA}`, 'Engineering', undefined, `${businessUnitB._id}`),
        /does not belong to organization/,
      );

      expect(savedTeams).toHaveLength(0);
      expect(organization.save).not.toHaveBeenCalled();
    });

    it('rejects a soft-deleted business unit', async () => {
      businessUnitA.deleted = true;

      await expectRejection(
        () => service.createTeam(`${organizationA}`, 'Engineering', undefined, `${businessUnitA._id}`),
        /is deleted/,
      );

      expect(savedTeams).toHaveLength(0);
    });

    it('rejects an unknown business unit', async () => {
      await expectRejection(
        () => service.createTeam(`${organizationA}`, 'Engineering', undefined, `${new ObjectId()}`),
        /could not be found/,
      );

      expect(savedTeams).toHaveLength(0);
    });

    it('rejects an invalid business unit id', async () => {
      await expectRejection(
        () => service.createTeam(`${organizationA}`, 'Engineering', undefined, 'not-an-object-id'),
        /is not a valid business unit id/,
      );

      expect(savedTeams).toHaveLength(0);
    });
  });

  describe('updateTeam', () => {
    it('persists the business unit link', async () => {
      const result = await service.updateTeam(`${team._id}`, {
        businessUnit: `${businessUnitA._id}`,
      });

      expect(result).toBe(team);
      expect(team.businessUnit.toString()).toBe(businessUnitA._id.toString());
      expect(team.save).toHaveBeenCalledTimes(1);
      expect(team.updatedBy.toString()).toBe(`${service.getExecutionContext().user._id}`);
    });

    it('clears the business unit when null is supplied', async () => {
      team.businessUnit = businessUnitA._id;

      await service.updateTeam(`${team._id}`, { businessUnit: null });

      expect(team.businessUnit).toBeNull();
      expect(models.BusinessUnit.findById).not.toHaveBeenCalled();
      expect(team.save).toHaveBeenCalledTimes(1);
    });

    it('leaves the business unit untouched when omitted', async () => {
      team.businessUnit = businessUnitA._id;

      await service.updateTeam(`${team._id}`, { name: 'Renamed' });

      expect(team.name).toBe('Renamed');
      expect(team.businessUnit.toString()).toBe(businessUnitA._id.toString());
      expect(models.BusinessUnit.findById).not.toHaveBeenCalled();
    });

    it('persists the owner', async () => {
      const newOwner = new ObjectId();

      await service.updateTeam(`${team._id}`, { owner: `${newOwner}` });

      expect(team.owner.toString()).toBe(newOwner.toString());
      expect(team.save).toHaveBeenCalledTimes(1);
    });

    it('clears the owner when null is supplied', async () => {
      await service.updateTeam(`${team._id}`, { owner: null });

      expect(team.owner).toBeNull();
      expect(team.save).toHaveBeenCalledTimes(1);
    });

    it('leaves the owner untouched when omitted', async () => {
      const originalOwner = `${team.owner}`;

      await service.updateTeam(`${team._id}`, { title: 'Platform Core' });

      expect(team.owner.toString()).toBe(originalOwner);
    });

    it('rejects an invalid owner id', async () => {
      await expectRejection(
        () => service.updateTeam(`${team._id}`, { owner: 'not-an-object-id' }),
        /owner is not a valid user id/,
      );

      expect(team.save).not.toHaveBeenCalled();
    });

    it('rejects a business unit from another organization', async () => {
      await expectRejection(
        () => service.updateTeam(`${team._id}`, { businessUnit: `${businessUnitB._id}` }),
        /does not belong to organization/,
      );

      expect(team.businessUnit).toBeNull();
      expect(team.save).not.toHaveBeenCalled();
    });

    it('rejects a soft-deleted business unit', async () => {
      businessUnitA.deleted = true;

      await expectRejection(
        () => service.updateTeam(`${team._id}`, { businessUnit: `${businessUnitA._id}` }),
        /is deleted/,
      );

      expect(team.save).not.toHaveBeenCalled();
    });

    it('keeps the ORG-001 text handling intact', async () => {
      await service.updateTeam(`${team._id}`, {
        name: '  Platform Core  ',
        title: '  Platform Core  ',
        description: 'Owns the runtime and the edge',
        avatar: 'core.png',
      });

      expect(team.name).toBe('Platform Core');
      expect(team.title).toBe('Platform Core');
      expect(team.description).toBe('Owns the runtime and the edge');
      expect(team.avatar).toBe('core.png');
    });

    it('rejects an unknown team', async () => {
      models.Team.findById.mockResolvedValue(null);

      await expectRejection(
        () => service.updateTeam(`${new ObjectId()}`, { name: 'Ghost' }),
        /could not be found/,
      );
    });
  });

  describe('moveTeamToBusinessUnit', () => {
    it('persists the linkage inside the same organization', async () => {
      const result = await service.moveTeamToBusinessUnit(
        `${team._id}`,
        `${businessUnitA._id}`,
      );

      expect(result).toBe(team);
      expect(team.businessUnit.toString()).toBe(businessUnitA._id.toString());
      expect(team.save).toHaveBeenCalledTimes(1);
      expect(team.updatedBy.toString()).toBe(`${service.getExecutionContext().user._id}`);
    });

    it('rejects a cross-organization move', async () => {
      await expectRejection(
        () => service.moveTeamToBusinessUnit(`${team._id}`, `${businessUnitB._id}`),
        /does not belong to organization/,
      );

      expect(team.businessUnit).toBeNull();
      expect(team.save).not.toHaveBeenCalled();
    });

    it('rejects a soft-deleted business unit', async () => {
      businessUnitA.deleted = true;

      await expectRejection(
        () => service.moveTeamToBusinessUnit(`${team._id}`, `${businessUnitA._id}`),
        /is deleted/,
      );

      expect(team.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown business unit', async () => {
      await expectRejection(
        () => service.moveTeamToBusinessUnit(`${team._id}`, `${new ObjectId()}`),
        /could not be found/,
      );

      expect(team.save).not.toHaveBeenCalled();
    });

    it('rejects a deleted team', async () => {
      team.deleted = true;

      await expectRejection(
        () => service.moveTeamToBusinessUnit(`${team._id}`, `${businessUnitA._id}`),
        /is deleted and cannot be moved/,
      );

      expect(team.save).not.toHaveBeenCalled();
    });

    it('requires a business unit id', async () => {
      await expectRejection(
        () => service.moveTeamToBusinessUnit(`${team._id}`, null as any),
        /businessUnitId is required/,
      );

      expect(team.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown team', async () => {
      models.Team.findById.mockResolvedValue(null);

      await expectRejection(
        () => service.moveTeamToBusinessUnit(`${new ObjectId()}`, `${businessUnitA._id}`),
        /could not be found/,
      );
    });
  });

  describe('pagedTeams', () => {
    it('filters by organization, business unit and excludes soft-deleted teams', async () => {
      const teams = [makeTeam({ organization: organizationA })];
      models.Team.find.mockImplementation(() => queryChain(teams));
      models.Team.countDocuments.mockResolvedValue(1);

      const result = await service.pagedTeams(
        `${organizationA}`,
        { businessUnitId: `${businessUnitA._id}` } as any,
        { page: 1, pageSize: 25 } as any,
      );

      const dbQuery = models.Team.find.mock.calls[0][0];
      expect(dbQuery.organization.toString()).toBe(organizationA.toString());
      expect(dbQuery.businessUnit.toString()).toBe(businessUnitA._id.toString());
      expect(dbQuery.deleted).toEqual({ $ne: true });
      expect(result.teams).toBe(teams);
      expect(result.paging).toMatchObject({ page: 1, pageSize: 25, total: 1 });
    });

    it('still filters by search across name and title, escaping the term', async () => {
      await service.pagedTeams(`${organizationA}`, { search: 'R&D (core).' } as any);

      const dbQuery = models.Team.find.mock.calls[0][0];
      expect(dbQuery.$or).toEqual([
        { name: { $regex: 'R&D \\(core\\)\\.', $options: 'i' } },
        { title: { $regex: 'R&D \\(core\\)\\.', $options: 'i' } },
      ]);
    });

    it('combines the business unit filter with the search term', async () => {
      await service.pagedTeams(`${organizationA}`, {
        search: 'Platform',
        businessUnitId: `${businessUnitA._id}`,
      } as any);

      const dbQuery = models.Team.find.mock.calls[0][0];
      expect(dbQuery.businessUnit.toString()).toBe(businessUnitA._id.toString());
      expect(dbQuery.$or).toHaveLength(2);
      expect(dbQuery.deleted).toEqual({ $ne: true });
    });

    it('returns the paged envelope used by PagedBusinessUnits', async () => {
      models.Team.countDocuments.mockResolvedValue(12);
      models.Team.find.mockImplementation(() => queryChain([makeTeam()]));

      const result = await service.pagedTeams(
        `${organizationA}`,
        {},
        { page: 2, pageSize: 5 } as any,
      );

      expect(result.paging).toMatchObject({
        page: 2,
        pageSize: 5,
        total: 12,
        hasNext: true,
      });
      expect(models.Team.find.mock.results[0].value.skip).toHaveBeenCalledWith(5);
      expect(models.Team.find.mock.results[0].value.limit).toHaveBeenCalledWith(5);
    });

    it('defaults to page 1 and a page size of 25', async () => {
      const result = await service.pagedTeams(`${organizationA}`);

      expect(result.paging.page).toBe(1);
      expect(result.paging.pageSize).toBe(25);
    });

    it('rejects an unknown organization', async () => {
      models.Organization.countDocuments.mockResolvedValue(0);

      await expectRejection(
        () => service.pagedTeams(`${organizationA}`),
        /could not be found/,
      );
    });

    it('rejects an invalid organization id', async () => {
      await expectRejection(
        () => service.pagedTeams('not-an-object-id'),
        /is not a valid/,
      );
    });

    it('rejects an invalid business unit id', async () => {
      await expectRejection(
        () => service.pagedTeams(`${organizationA}`, { businessUnitId: 'nope' } as any),
        /is not a valid business unit id/,
      );
    });
  });

  describe('getPagedTeamsForOrganization (legacy contract)', () => {
    it('still lists across organizations when no organization is supplied', async () => {
      await service.getPagedTeamsForOrganization(undefined, {});

      const dbQuery = models.Team.find.mock.calls[0][0];
      expect(dbQuery.organization).toBeUndefined();
      expect(dbQuery.deleted).toEqual({ $ne: true });
    });

    it('accepts the business unit filter', async () => {
      await service.getPagedTeamsForOrganization(`${organizationA}`, {
        businessUnitId: `${businessUnitA._id}`,
      } as any);

      const dbQuery = models.Team.find.mock.calls[0][0];
      expect(dbQuery.businessUnit.toString()).toBe(businessUnitA._id.toString());
    });
  });

  describe('org-scoped authorization', () => {
    it('denies an ORGANIZATION_ADMIN of organization B updating a team in organization A', async () => {
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.updateTeam(`${team._id}`, { name: 'Hijacked' }),
        /permission/i,
      );

      expect(team.name).toBe('Platform');
      expect(team.save).not.toHaveBeenCalled();
    });

    it('denies an ORGANIZATION_ADMIN of organization B moving a team in organization A', async () => {
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.moveTeamToBusinessUnit(`${team._id}`, `${businessUnitB._id}`),
        /permission/i,
      );

      expect(team.businessUnit).toBeNull();
      expect(team.save).not.toHaveBeenCalled();
    });

    it('denies an ORGANIZATION_ADMIN of organization B deleting a team in organization A', async () => {
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.deleteTeam(`${team._id}`),
        /permission/i,
      );

      expect(team.deleted).toBe(false);
      expect(team.save).not.toHaveBeenCalled();
    });

    it('denies a plain USER', async () => {
      const plainUser = serviceFor({});

      await expectRejection(
        () => plainUser.updateTeam(`${team._id}`, { name: 'Nope' }),
        /permission/i,
      );

      expect(team.save).not.toHaveBeenCalled();
    });

    it('allows a platform ADMIN on any organization', async () => {
      const admin = serviceFor({ admin: true });

      await admin.updateTeam(`${team._id}`, { description: 'Admin edit' });

      expect(team.description).toBe('Admin edit');
      expect(team.save).toHaveBeenCalledTimes(1);
    });
  });
});
