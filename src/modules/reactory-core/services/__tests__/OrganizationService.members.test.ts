/**
 * Organization membership management on OrganizationService (ORG-023).
 *
 * Covers the three pieces the ticket adds - `pagedOrganizationMembers`,
 * `inviteOrganizationMember`, `deactivateOrganizationMember` - plus the first
 * login conversion (`acceptPendingInvitations`) and the authorization
 * freshness guarantee.
 *
 * The REAL `User` model is used for the acting user so `assertOrgAdmin` runs
 * against the shipped membership semantics rather than a mock that encodes the
 * intended answer.
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
  Team.find = jest.fn();
  Team.findOne = jest.fn();
  Team.findById = jest.fn();
  Team.countDocuments = jest.fn();

  const Organization: any = jest.fn();
  Organization.findById = jest.fn();
  Organization.findOne = jest.fn();
  Organization.find = jest.fn();
  Organization.countDocuments = jest.fn();

  const BusinessUnit: any = jest.fn();
  BusinessUnit.find = jest.fn();
  BusinessUnit.findOne = jest.fn();
  BusinessUnit.findById = jest.fn();
  BusinessUnit.countDocuments = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();
  User.findOne = jest.fn();
  User.find = jest.fn();
  User.countDocuments = jest.fn();

  const Organigram: any = jest.fn();
  Organigram.findOne = jest.fn();

  const OrganizationInvitation: any = jest.fn();
  OrganizationInvitation.find = jest.fn();
  OrganizationInvitation.findOne = jest.fn();
  OrganizationInvitation.countDocuments = jest.fn();

  return { Team, Organization, BusinessUnit, User, Organigram, OrganizationInvitation };
});

const models = require('@reactory/server-modules/reactory-core/models');

const RealUserModel = jest.requireActual(
  '@reactory/server-modules/reactory-core/models/User',
).default;

interface IRolePolicy {
  admin?: boolean;
  system?: boolean;
  orgAdminOf?: string[];
}

/** A mongoose-like query stub: `.select().sort().skip().limit()` then await. */
const queryChain = (result: any[]) => {
  const chain: any = {
    select: jest.fn(() => chain),
    populate: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return chain;
};

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
    firstName: 'Operator',
    lastName: 'User',
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

/** Builds a member user document with the REAL model (membership semantics). */
const makeMember = (
  clientId: ObjectId,
  organizationId: string | null,
  overrides: Record<string, any> = {},
  memberships: any[] = [],
): any => {
  const user: any = new RealUserModel({
    _id: new ObjectId(),
    firstName: 'Member',
    lastName: 'Person',
    email: `member-${new ObjectId()}@example.com`,
    roles: ['USER'],
    memberships:
      memberships.length > 0
        ? memberships
        : [
            {
              clientId,
              organizationId: organizationId ? new ObjectId(organizationId) : null,
              businessUnitId: null,
              roles: ['USER'],
              enabled: true,
              authProvider: 'default',
              created: new Date('2026-01-01T00:00:00.000Z'),
              lastLogin: new Date('2026-02-01T00:00:00.000Z'),
            },
          ],
    ...overrides,
  });
  user.save = jest.fn().mockResolvedValue(user);
  return user;
};

const makeInvitation = (overrides: Record<string, any> = {}): any => ({
  _id: new ObjectId(),
  email: 'invitee@example.com',
  roles: ['USER'],
  status: 'pending',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  updatedAt: new Date('2026-03-01T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const expectRejection = async (call: () => Promise<any>, matcher: RegExp): Promise<void> => {
  await expect(Promise.resolve().then(call)).rejects.toThrow(matcher);
};

describe('OrganizationService membership management (ORG-023)', () => {
  let organizationA: ObjectId;
  let organizationB: ObjectId;
  let partnerId: ObjectId;
  let organization: any;
  let serviceFor: (policy: IRolePolicy) => OrganizationService;
  let service: OrganizationService;

  beforeEach(() => {
    jest.clearAllMocks();

    organizationA = new ObjectId();
    organizationB = new ObjectId();

    organization = {
      _id: organizationA,
      name: 'Acme',
      status: 'active',
      deleted: false,
      save: jest.fn().mockResolvedValue(undefined),
    };

    models.Organization.findById.mockResolvedValue(organization);
    models.Organization.countDocuments.mockResolvedValue(1);
    models.Organization.find.mockImplementation(() => queryChain([{ _id: organizationA }]));
    models.Organization.findOne.mockResolvedValue(null);

    models.User.find.mockImplementation(() => queryChain([]));
    models.User.countDocuments.mockResolvedValue(0);
    models.User.findOne.mockResolvedValue(null);
    models.User.findById.mockResolvedValue(null);

    models.BusinessUnit.find.mockImplementation(() => queryChain([]));
    models.BusinessUnit.findOne.mockResolvedValue(null);

    models.Team.find.mockImplementation(() => queryChain([]));
    models.Team.findOne.mockResolvedValue(null);

    models.OrganizationInvitation.find.mockImplementation(() => queryChain([]));
    models.OrganizationInvitation.findOne.mockResolvedValue(null);
    models.OrganizationInvitation.countDocuments.mockResolvedValue(0);
    models.OrganizationInvitation.mockImplementation((doc: any) => ({
      ...doc,
      _id: new ObjectId(),
      save: jest.fn().mockResolvedValue(undefined),
    }));

    serviceFor = (policy: IRolePolicy) => new OrganizationService({}, makeContext(policy));
    service = serviceFor({ orgAdminOf: [`${organizationA}`] });
    partnerId = service.getExecutionContext().partner._id;
  });

  describe('pagedOrganizationMembers', () => {
    it('refuses a plain USER (the query exposes member PII)', async () => {
      const plainUser = serviceFor({});

      await expectRejection(
        () => plainUser.pagedOrganizationMembers(`${organizationA}`),
        /permissions/i,
      );

      expect(models.User.find).not.toHaveBeenCalled();
    });

    it('refuses an ORGANIZATION_ADMIN of another organization', async () => {
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.pagedOrganizationMembers(`${organizationA}`),
        /permission/i,
      );

      expect(models.User.find).not.toHaveBeenCalled();
    });

    it('requires an exact organizationId match, so client-wide memberships cannot match', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery.memberships.$elemMatch.clientId.toString()).toBe(partnerId.toString());
      expect(dbQuery.memberships.$elemMatch.organizationId.toString()).toBe(
        organizationA.toString(),
      );
      // The predicate is an exact ObjectId, never a $ne/$in that could admit null.
      expect(dbQuery.memberships.$elemMatch.organizationId).toBeInstanceOf(ObjectId);
    });

    it('never turns a client-wide-only member into an organization member row', async () => {
      const clientWideOnly = makeMember(partnerId, null);
      const organizationMember = makeMember(partnerId, `${organizationA}`);

      models.User.find.mockImplementation(() =>
        queryChain([clientWideOnly, organizationMember]),
      );
      models.User.countDocuments.mockResolvedValue(2);

      const result = await service.pagedOrganizationMembers(`${organizationA}`);

      expect(result.members).toHaveLength(1);
      expect(result.members[0].userId).toBe(`${organizationMember._id}`);
    });

    it('excludes deactivated memberships by default', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery.memberships.$elemMatch.enabled).toEqual({ $ne: false });
    });

    it('includes deactivated memberships when asked', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`, {
        includeDeactivated: true,
      } as any);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery.memberships.$elemMatch.enabled).toBeUndefined();
    });

    it('returns only deactivated memberships for the deactivated view', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`, {
        deactivatedOnly: true,
      } as any);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery.memberships.$elemMatch.enabled).toBe(false);
    });

    it('supports status: "deactivated" and status: "active"', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`, {
        status: 'deactivated',
      } as any);
      expect(models.User.find.mock.calls[0][0].memberships.$elemMatch.enabled).toBe(false);

      jest.clearAllMocks();
      models.Organization.countDocuments.mockResolvedValue(1);
      models.User.find.mockImplementation(() => queryChain([]));
      models.User.countDocuments.mockResolvedValue(0);

      await service.pagedOrganizationMembers(`${organizationA}`, {
        status: 'active',
      } as any);
      expect(models.User.find.mock.calls[0][0].memberships.$elemMatch.enabled).toEqual({
        $ne: false,
      });
    });

    it('filters by role', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`, {
        role: 'ORGANIZATION_ADMIN',
      } as any);

      expect(models.User.find.mock.calls[0][0].memberships.$elemMatch.roles).toBe(
        'ORGANIZATION_ADMIN',
      );
    });

    it('searches name and email case-insensitively and escapes regex metacharacters', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`, {
        search: 'R&D (core).',
      } as any);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery.$or).toEqual([
        { firstName: { $regex: 'R&D \\(core\\)\\.', $options: 'i' } },
        { lastName: { $regex: 'R&D \\(core\\)\\.', $options: 'i' } },
        { email: { $regex: 'R&D \\(core\\)\\.', $options: 'i' } },
      ]);
    });

    it('returns the paged envelope used by PagedBusinessUnits / PagedTeams', async () => {
      models.User.find.mockImplementation(() => queryChain([]));
      models.User.countDocuments.mockResolvedValue(12);

      const result = await service.pagedOrganizationMembers(
        `${organizationA}`,
        {},
        { page: 2, pageSize: 5 } as any,
      );

      expect(result.paging).toMatchObject({
        page: 2,
        pageSize: 5,
        total: 12,
        pageCount: 3,
        hasNext: true,
      });
      expect(models.User.find.mock.results[0].value.skip).toHaveBeenCalledWith(5);
      expect(models.User.find.mock.results[0].value.limit).toHaveBeenCalledWith(5);
    });

    it('returns membership-shaped rows with membership id, roles, BU and team refs', async () => {
      const businessUnitId = new ObjectId();
      const teamId = new ObjectId();
      const member = makeMember(
        partnerId,
        `${organizationA}`,
        {},
        [
          {
            clientId: partnerId,
            organizationId: organizationA,
            businessUnitId,
            roles: ['USER', 'TEAM_ADMIN'],
            enabled: true,
            authProvider: 'default',
            created: new Date('2026-01-01T00:00:00.000Z'),
            lastLogin: new Date('2026-02-01T00:00:00.000Z'),
          },
        ],
      );
      const membershipId = member.memberships[0]._id;

      models.User.find.mockImplementation(() => queryChain([member]));
      models.User.countDocuments.mockResolvedValue(1);
      models.BusinessUnit.find.mockImplementation(() =>
        queryChain([{ _id: businessUnitId, name: 'Engineering', organization: organizationA }]),
      );
      models.Team.find.mockImplementation(() =>
        queryChain([{ _id: teamId, name: 'Platform', title: 'Platform', members: [member._id] }]),
      );

      const result = await service.pagedOrganizationMembers(`${organizationA}`);
      const row = result.members[0];

      expect(row.id).toBe(`${membershipId}`);
      expect(row.userId).toBe(`${member._id}`);
      expect(row.user._id).toBe(`${member._id}`);
      // B-1: `User.id` is declared `ObjID!` - the row must satisfy the schema
      // on its own, not rely on the User property resolver deriving it from _id.
      expect(row.user.id).toBe(`${member._id}`);
      expect(row.user.email).toBe(member.email);
      expect(row.roles).toEqual(['USER', 'TEAM_ADMIN']);
      expect(row.enabled).toBe(true);
      expect(row.status).toBe('active');
      expect(row.businessUnitId).toBe(`${businessUnitId}`);
      expect(row.businessUnit.name).toBe('Engineering');
      expect(row.teamIds).toEqual([`${teamId}`]);
      expect(row.teams[0].name).toBe('Platform');
      // B-1: `Team.id` is declared `ObjID!` - each team entry carries its own id.
      expect(row.teams[0].id).toBe(`${teamId}`);
      expect(row.created).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(row.lastLogin).toEqual(new Date('2026-02-01T00:00:00.000Z'));
      expect(row.invited).toBe(false);
    });

    it('marks a deactivated membership as deactivated when it is included', async () => {
      const member = makeMember(partnerId, `${organizationA}`, {}, [
        {
          clientId: partnerId,
          organizationId: organizationA,
          businessUnitId: null,
          roles: ['USER'],
          enabled: false,
          created: new Date(),
        },
      ]);
      models.User.find.mockImplementation(() => queryChain([member]));
      models.User.countDocuments.mockResolvedValue(1);

      const result = await service.pagedOrganizationMembers(`${organizationA}`, {
        includeDeactivated: true,
      } as any);

      expect(result.members[0].status).toBe('deactivated');
      expect(result.members[0].enabled).toBe(false);
    });

    it('filters to enabled memberships only when enabled is true', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`, {
        enabled: true,
      } as any);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery.memberships.$elemMatch.enabled).toBe(true);
    });

    it('filters to deactivated memberships when enabled is false', async () => {
      await service.pagedOrganizationMembers(`${organizationA}`, {
        enabled: false,
      } as any);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery.memberships.$elemMatch.enabled).toBe(false);
    });

    it('filters by a valid business unit id', async () => {
      const businessUnitId = new ObjectId();
      const member = makeMember(partnerId, `${organizationA}`, {}, [
        {
          clientId: partnerId,
          organizationId: organizationA,
          businessUnitId,
          roles: ['USER'],
          enabled: true,
        },
      ]);
      models.User.find.mockImplementation(() => queryChain([member]));
      models.User.countDocuments.mockResolvedValue(1);
      models.BusinessUnit.find.mockImplementation(() =>
        queryChain([{ _id: businessUnitId, name: 'Engineering', organization: organizationA }]),
      );

      const result = await service.pagedOrganizationMembers(`${organizationA}`, {
        businessUnitId: `${businessUnitId}`,
      } as any);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery.memberships.$elemMatch.businessUnitId.toString()).toBe(
        businessUnitId.toString(),
      );
      expect(result.members[0].businessUnitId).toBe(`${businessUnitId}`);
      expect(result.members[0].businessUnit.name).toBe('Engineering');
    });

    it('rejects an invalid business unit id filter', async () => {
      await expectRejection(
        () => service.pagedOrganizationMembers(`${organizationA}`, { businessUnitId: 'nope' } as any),
        /is not a valid/,
      );

      expect(models.User.find).not.toHaveBeenCalled();
    });

    it('filters by team membership', async () => {
      const teamId = new ObjectId();
      const member = makeMember(partnerId, `${organizationA}`);
      models.Team.findOne.mockResolvedValue({ _id: teamId, members: [member._id] });
      models.User.find.mockImplementation(() => queryChain([member]));
      models.User.countDocuments.mockResolvedValue(1);

      const result = await service.pagedOrganizationMembers(`${organizationA}`, {
        teamId: `${teamId}`,
      } as any);

      const dbQuery = models.User.find.mock.calls[0][0];
      expect(dbQuery._id.$in.map((id: any) => `${id}`)).toEqual([`${member._id}`]);
      expect(result.members).toHaveLength(1);
    });

    it('rejects an unknown team filter', async () => {
      models.Team.findOne.mockResolvedValue(null);

      await expectRejection(
        () => service.pagedOrganizationMembers(`${organizationA}`, { teamId: `${new ObjectId()}` } as any),
        /could not be found/,
      );
    });

    it('rejects an invalid team id filter', async () => {
      await expectRejection(
        () => service.pagedOrganizationMembers(`${organizationA}`, { teamId: 'not-an-object-id' } as any),
        /is not a valid/,
      );

      expect(models.Team.findOne).not.toHaveBeenCalled();
      expect(models.User.find).not.toHaveBeenCalled();
    });

    it('rejects an unknown organization', async () => {
      models.Organization.countDocuments.mockResolvedValue(0);

      await expectRejection(
        () => service.pagedOrganizationMembers(`${organizationA}`),
        /could not be found/,
      );
    });

    it('rejects an invalid organization id', async () => {
      await expectRejection(
        () => service.pagedOrganizationMembers('not-an-object-id'),
        /is not a valid/,
      );
    });

    it('lists pending invitations behind status: "invited"', async () => {
      const invitation = makeInvitation({ organizationId: organizationA, clientId: partnerId });
      models.OrganizationInvitation.find.mockImplementation(() => queryChain([invitation]));
      models.OrganizationInvitation.countDocuments.mockResolvedValue(1);

      const result = await service.pagedOrganizationMembers(`${organizationA}`, {
        status: 'invited',
      } as any);

      const dbQuery = models.OrganizationInvitation.find.mock.calls[0][0];
      expect(dbQuery.status).toBe('pending');
      expect(dbQuery.organizationId.toString()).toBe(organizationA.toString());
      expect(result.members).toHaveLength(1);
      expect(result.members[0].status).toBe('invited');
      expect(result.members[0].invited).toBe(true);
      expect(result.members[0].userId).toBeNull();
    });

    it('combines status: "invited" with a search term, role and business unit', async () => {
      const businessUnitId = new ObjectId();
      const invitation = makeInvitation({
        organizationId: organizationA,
        clientId: partnerId,
        businessUnitId,
      });
      models.OrganizationInvitation.find.mockImplementation(() => queryChain([invitation]));
      models.OrganizationInvitation.countDocuments.mockResolvedValue(1);
      models.BusinessUnit.find.mockImplementation(() =>
        queryChain([{ _id: businessUnitId, name: 'Engineering', organization: organizationA }]),
      );

      const result = await service.pagedOrganizationMembers(`${organizationA}`, {
        status: 'invited',
        search: 'Invitee (new)',
        role: 'ORGANIZATION_ADMIN',
        businessUnitId: `${businessUnitId}`,
      } as any);

      const dbQuery = models.OrganizationInvitation.find.mock.calls[0][0];
      expect(dbQuery.status).toBe('pending');
      expect(dbQuery.email).toEqual({ $regex: 'Invitee \\(new\\)', $options: 'i' });
      expect(dbQuery.roles).toBe('ORGANIZATION_ADMIN');
      expect(dbQuery.businessUnitId.toString()).toBe(businessUnitId.toString());
      expect(result.members[0].businessUnitId).toBe(`${businessUnitId}`);
      expect(result.members[0].businessUnit.name).toBe('Engineering');
    });

    it('rejects an invalid business unit id on the invited listing', async () => {
      await expectRejection(
        () =>
          service.pagedOrganizationMembers(`${organizationA}`, {
            status: 'invited',
            businessUnitId: 'nope',
          } as any),
        /is not a valid/,
      );

      expect(models.OrganizationInvitation.find).not.toHaveBeenCalled();
    });

    it('allows a platform ADMIN on any organization', async () => {
      await expect(
        serviceFor({ admin: true }).pagedOrganizationMembers(`${organizationB}`),
      ).resolves.toBeDefined();
    });
  });

  describe('inviteOrganizationMember', () => {
    it('creates a pending invitation for an email with no user account', async () => {
      const result = await service.inviteOrganizationMember(
        `${organizationA}`,
        '  New.Person@Example.com ',
        ['USER', 'TEAM_ADMIN'],
        null,
      );

      const saved = models.OrganizationInvitation.mock.calls[0][0];
      expect(saved.email).toBe('new.person@example.com');
      expect(saved.organizationId.toString()).toBe(organizationA.toString());
      expect(saved.clientId.toString()).toBe(partnerId.toString());
      expect(saved.roles).toEqual(['USER', 'TEAM_ADMIN']);
      expect(saved.status).toBe('pending');
      expect(saved.invitedBy.toString()).toBe(
        `${service.getExecutionContext().user._id}`,
      );

      expect(result.status).toBe('invited');
      expect(result.invited).toBe(true);
      expect(result.email).toBe('new.person@example.com');
      expect(result.roles).toEqual(['USER', 'TEAM_ADMIN']);
      expect(result.enabled).toBe(false);

      // No shell account is created.
      expect(models.User.find).not.toHaveBeenCalled();
      expect(models.User.findOne).toHaveBeenCalledWith({ email: 'new.person@example.com' });
    });

    it('defaults roles to USER', async () => {
      await service.inviteOrganizationMember(`${organizationA}`, 'new@example.com');

      expect(models.OrganizationInvitation.mock.calls[0][0].roles).toEqual(['USER']);
    });

    it('rejects an email that is already an active member', async () => {
      const existing = makeMember(partnerId, `${organizationA}`);
      models.User.findOne.mockResolvedValue(existing);

      await expectRejection(
        () => service.inviteOrganizationMember(`${organizationA}`, existing.email),
        /already a member/,
      );

      expect(models.OrganizationInvitation).not.toHaveBeenCalled();
    });

    it('rejects an email with a deactivated membership (re-activation is addMember)', async () => {
      const existing = makeMember(partnerId, `${organizationA}`, {}, [
        {
          clientId: partnerId,
          organizationId: organizationA,
          businessUnitId: null,
          roles: ['USER'],
          enabled: false,
        },
      ]);
      models.User.findOne.mockResolvedValue(existing);

      await expectRejection(
        () => service.inviteOrganizationMember(`${organizationA}`, existing.email),
        /deactivated membership/,
      );

      expect(models.OrganizationInvitation).not.toHaveBeenCalled();
    });

    it('rejects a duplicate pending invitation', async () => {
      models.OrganizationInvitation.findOne.mockResolvedValue(makeInvitation());

      await expectRejection(
        () => service.inviteOrganizationMember(`${organizationA}`, 'invitee@example.com'),
        /already pending/,
      );
    });

    it('rejects an invalid email address', async () => {
      await expectRejection(
        () => service.inviteOrganizationMember(`${organizationA}`, 'not-an-email'),
        /not a valid email/,
      );
    });

    it('rejects an ORGANIZATION_ADMIN of another organization', async () => {
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.inviteOrganizationMember(`${organizationA}`, 'new@example.com'),
        /permission/i,
      );

      expect(models.OrganizationInvitation).not.toHaveBeenCalled();
    });

    it('rejects a business unit that is not in this organization', async () => {
      models.BusinessUnit.findOne.mockResolvedValue(null);

      await expectRejection(
        () =>
          service.inviteOrganizationMember(
            `${organizationA}`,
            'new@example.com',
            ['USER'],
            `${new ObjectId()}`,
          ),
        /could not be found/,
      );

      expect(models.OrganizationInvitation).not.toHaveBeenCalled();
    });

    it('rejects an invalid business unit id', async () => {
      await expectRejection(
        () =>
          service.inviteOrganizationMember(
            `${organizationA}`,
            'new@example.com',
            ['USER'],
            'not-an-object-id',
          ),
        /is not a valid/,
      );

      expect(models.BusinessUnit.findOne).not.toHaveBeenCalled();
      expect(models.OrganizationInvitation).not.toHaveBeenCalled();
    });

    it('stores a valid business unit and returns the resolved unit on the pending row', async () => {
      const businessUnitId = new ObjectId();
      const businessUnit = {
        _id: businessUnitId,
        name: 'Engineering',
        organization: organizationA,
        deleted: false,
      };
      models.BusinessUnit.findOne.mockResolvedValue(businessUnit);
      models.BusinessUnit.find.mockImplementation(() => queryChain([businessUnit]));

      const result = await service.inviteOrganizationMember(
        `${organizationA}`,
        'new@example.com',
        ['USER', 'BUSINESS_UNIT_ADMIN'],
        `${businessUnitId}`,
      );

      // The unit lookup is scoped to this organization and excludes deleted units.
      const lookup = models.BusinessUnit.findOne.mock.calls[0][0];
      expect(lookup._id.toString()).toBe(businessUnitId.toString());
      expect(lookup.organization.toString()).toBe(organizationA.toString());
      expect(lookup.deleted).toEqual({ $ne: true });

      // The invitation persists the ObjectId, not the caller's string.
      const saved = models.OrganizationInvitation.mock.calls[0][0];
      expect(saved.businessUnitId).toBeInstanceOf(ObjectId);
      expect(saved.businessUnitId.toString()).toBe(businessUnitId.toString());

      // The returned pending row carries the resolved unit.
      expect(result.businessUnitId).toBe(`${businessUnitId}`);
      expect(result.businessUnit).toBe(businessUnit);
      expect(result.businessUnit.name).toBe('Engineering');
      expect(result.status).toBe('invited');
      expect(result.roles).toEqual(['USER', 'BUSINESS_UNIT_ADMIN']);
    });
  });

  describe('acceptPendingInvitations (first login conversion)', () => {
    it('converts a pending invitation into an active membership', async () => {
      const user = makeMember(partnerId, null);
      const invitation = makeInvitation({
        clientId: partnerId,
        organizationId: organizationA,
        roles: ['USER', 'ORGANIZATION_ADMIN'],
        email: user.email,
      });
      models.OrganizationInvitation.find.mockImplementation(() => queryChain([invitation]));
      models.Organization.find.mockImplementation(() => queryChain([{ _id: organizationA }]));

      const accepted = await service.acceptPendingInvitations(
        user,
        service.getExecutionContext(),
      );

      expect(accepted).toBe(1);
      const membership = user.memberships.find(
        (m: any) => m.organizationId && `${m.organizationId}` === `${organizationA}`,
      );
      expect(membership).toBeDefined();
      expect(membership.enabled).toBe(true);
      expect(membership.roles).toEqual(['USER', 'ORGANIZATION_ADMIN']);
      expect(membership.authProvider).toBe('invitation');
      expect(user.save).toHaveBeenCalled();
      expect(invitation.status).toBe('accepted');
      expect(invitation.acceptedAt).toBeInstanceOf(Date);
      expect(invitation.acceptedBy.toString()).toBe(`${user._id}`);
      expect(invitation.save).toHaveBeenCalled();
    });

    it('is idempotent: a repeat pass finds nothing pending and does not write', async () => {
      const user = makeMember(partnerId, null);
      models.OrganizationInvitation.find.mockImplementation(() => queryChain([]));

      const accepted = await service.acceptPendingInvitations(
        user,
        service.getExecutionContext(),
      );

      expect(accepted).toBe(0);
      expect(user.save).not.toHaveBeenCalled();
    });

    it('preserves an existing client-wide membership while adding the org membership', async () => {
      const user = makeMember(partnerId, null);
      const clientWideBefore = user.memberships[0];

      models.OrganizationInvitation.find.mockImplementation(() =>
        queryChain([makeInvitation({ clientId: partnerId, organizationId: organizationA, email: user.email })]),
      );
      models.Organization.find.mockImplementation(() => queryChain([{ _id: organizationA }]));

      await service.acceptPendingInvitations(user, service.getExecutionContext());

      expect(user.memberships).toHaveLength(2);
      expect(clientWideBefore.organizationId).toBeNull();
      expect(clientWideBefore.enabled).toBe(true);
    });

    it('re-activates a deactivated organization membership instead of duplicating it', async () => {
      const user = makeMember(partnerId, `${organizationA}`, {}, [
        {
          clientId: partnerId,
          organizationId: organizationA,
          businessUnitId: null,
          roles: ['USER'],
          enabled: false,
        },
      ]);

      models.OrganizationInvitation.find.mockImplementation(() =>
        queryChain([
          makeInvitation({
            clientId: partnerId,
            organizationId: organizationA,
            roles: ['USER', 'TEAM_ADMIN'],
            email: user.email,
          }),
        ]),
      );
      models.Organization.find.mockImplementation(() => queryChain([{ _id: organizationA }]));

      await service.acceptPendingInvitations(user, service.getExecutionContext());

      const organizationMemberships = user.memberships.filter(
        (m: any) => m.organizationId && `${m.organizationId}` === `${organizationA}`,
      );
      expect(organizationMemberships).toHaveLength(1);
      expect(organizationMemberships[0].enabled).toBe(true);
      expect(organizationMemberships[0].roles).toEqual(
        expect.arrayContaining(['USER', 'TEAM_ADMIN']),
      );
    });

    it('adopts the invited business unit when the existing membership has none', async () => {
      const businessUnitId = new ObjectId();
      const user = makeMember(partnerId, `${organizationA}`, {}, [
        {
          clientId: partnerId,
          organizationId: organizationA,
          businessUnitId: null,
          roles: ['USER'],
          enabled: false,
        },
      ]);

      models.OrganizationInvitation.find.mockImplementation(() =>
        queryChain([
          makeInvitation({
            clientId: partnerId,
            organizationId: organizationA,
            businessUnitId,
            email: user.email,
          }),
        ]),
      );
      models.Organization.find.mockImplementation(() => queryChain([{ _id: organizationA }]));

      await service.acceptPendingInvitations(user, service.getExecutionContext());

      const membership = user.memberships.find(
        (m: any) => m.organizationId && `${m.organizationId}` === `${organizationA}`,
      );
      expect(membership.businessUnitId.toString()).toBe(businessUnitId.toString());
    });

    it('skips invitations for a deleted or archived organization', async () => {
      const user = makeMember(partnerId, null);
      const invitation = makeInvitation({
        clientId: partnerId,
        organizationId: organizationA,
        email: user.email,
      });
      models.OrganizationInvitation.find.mockImplementation(() => queryChain([invitation]));
      models.Organization.find.mockImplementation(() => queryChain([]));

      const accepted = await service.acceptPendingInvitations(
        user,
        service.getExecutionContext(),
      );

      expect(accepted).toBe(0);
      expect(invitation.status).toBe('pending');
      expect(user.save).not.toHaveBeenCalled();
    });
  });

  describe('deactivateOrganizationMember', () => {
    it('sets enabled: false on the organization membership and saves', async () => {
      const member = makeMember(partnerId, `${organizationA}`);
      models.User.findById.mockResolvedValue(member);

      const result = await service.deactivateOrganizationMember(
        `${organizationA}`,
        `${member._id}`,
      );

      expect(result).toBe(organization);
      const membership = member.memberships.find(
        (m: any) => m.organizationId && `${m.organizationId}` === `${organizationA}`,
      );
      expect(membership.enabled).toBe(false);
      expect(member.save).toHaveBeenCalledTimes(1);
    });

    it('never touches the client-wide membership (organizationId: null)', async () => {
      const member = makeMember(partnerId, `${organizationA}`, {}, [
        {
          clientId: partnerId,
          organizationId: null,
          businessUnitId: null,
          roles: ['USER'],
          enabled: true,
        },
        {
          clientId: partnerId,
          organizationId: organizationA,
          businessUnitId: null,
          roles: ['USER'],
          enabled: true,
        },
      ]);
      models.User.findById.mockResolvedValue(member);

      await service.deactivateOrganizationMember(`${organizationA}`, `${member._id}`);

      const clientWide = member.memberships.find((m: any) => m.organizationId === null);
      const organizationMembership = member.memberships.find(
        (m: any) => m.organizationId && `${m.organizationId}` === `${organizationA}`,
      );
      expect(clientWide.enabled).toBe(true);
      expect(organizationMembership.enabled).toBe(false);
    });

    it('rejects a user whose only membership is client-wide', async () => {
      const member = makeMember(partnerId, null);
      models.User.findById.mockResolvedValue(member);

      await expectRejection(
        () => service.deactivateOrganizationMember(`${organizationA}`, `${member._id}`),
        /does not have a membership/,
      );

      expect(member.save).not.toHaveBeenCalled();
    });

    it('rejects an ORGANIZATION_ADMIN of another organization', async () => {
      const member = makeMember(partnerId, `${organizationA}`);
      models.User.findById.mockResolvedValue(member);
      const crossTenantAdmin = serviceFor({ orgAdminOf: [`${organizationB}`] });

      await expectRejection(
        () => crossTenantAdmin.deactivateOrganizationMember(`${organizationA}`, `${member._id}`),
        /permission/i,
      );

      expect(member.save).not.toHaveBeenCalled();
    });

    it('keeps removeOrganizationMember as the hard removal (client-wide intact)', async () => {
      const member = makeMember(partnerId, `${organizationA}`, {}, [
        {
          clientId: partnerId,
          organizationId: null,
          businessUnitId: null,
          roles: ['USER'],
          enabled: true,
        },
        {
          clientId: partnerId,
          organizationId: organizationA,
          businessUnitId: null,
          roles: ['USER'],
          enabled: true,
        },
      ]);
      models.User.findById.mockResolvedValue(member);

      await service.removeMember(`${organizationA}`, `${member._id}`);

      expect(member.memberships).toHaveLength(1);
      expect(member.memberships[0].organizationId).toBeNull();
      expect(member.save).toHaveBeenCalled();
    });
  });

  describe('authorization freshness', () => {
    it('picks up a role change on the next authorization check without a new token', async () => {
      const context = makeContext({ orgAdminOf: [`${organizationA}`] });
      const live = new OrganizationService({}, context);

      // The admin membership is downgraded on the persisted document, exactly as
      // setMemberRoles would leave it.
      const adminMembership = context.user.memberships.find(
        (m: any) => m.organizationId && `${m.organizationId}` === `${organizationA}`,
      );
      adminMembership.roles = ['USER'];

      const member = makeMember(context.partner._id, `${organizationA}`);
      models.User.findById.mockResolvedValue(member);

      await expectRejection(
        () => live.deactivateOrganizationMember(`${organizationA}`, `${member._id}`),
        /permission/i,
      );

      // Grant it back on the same document; no re-login, no new JWT.
      adminMembership.roles = ['USER', 'ORGANIZATION_ADMIN'];

      await expect(
        live.deactivateOrganizationMember(`${organizationA}`, `${member._id}`),
      ).resolves.toBeDefined();

      expect(member.save).toHaveBeenCalled();
    });

    it('a deactivated admin membership immediately loses admin authority', async () => {
      const context = makeContext({ orgAdminOf: [`${organizationA}`] });
      const live = new OrganizationService({}, context);
      const adminMembership = context.user.memberships.find(
        (m: any) => m.organizationId && `${m.organizationId}` === `${organizationA}`,
      );

      const member = makeMember(context.partner._id, `${organizationA}`);
      models.User.findById.mockResolvedValue(member);

      await expect(
        live.deactivateOrganizationMember(`${organizationA}`, `${member._id}`),
      ).resolves.toBeDefined();

      adminMembership.enabled = false;

      await expectRejection(
        () => live.deactivateOrganizationMember(`${organizationA}`, `${member._id}`),
        /permission/i,
      );
    });
  });
});
