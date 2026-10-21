import fs from 'fs';
import os from 'os';
import path from 'path';
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
  BusinessUnit.findOne = jest.fn();
  BusinessUnit.findById = jest.fn();
  BusinessUnit.countDocuments = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();
  User.countDocuments = jest.fn();

  return { Team, Organization, BusinessUnit, User };
});

const models = require('@reactory/server-modules/reactory-core/models');

/**
 * Role policy for a test context.
 *
 * `admin`       - platform ADMIN, any organization.
 * `orgAdminOf`  - ids of organizations the caller administers.
 * `system`      - the SYSTEM service role.
 */
interface IRolePolicy {
  admin?: boolean;
  orgAdminOf?: string[];
  system?: boolean;
}

/**
 * Builds an execution context whose `user.hasRole(clientId, role,
 * organizationId?)` mirrors the real model: ADMIN is organization agnostic,
 * ORGANIZATION_ADMIN only matches the organization it is scoped to.
 */
const makeContext = (policy: IRolePolicy = {}) => {
  const partnerId = new ObjectId();
  const orgAdminOf = policy.orgAdminOf || [];

  const context: any = {
    user: {
      _id: new ObjectId(),
      memberships: [],
      hasRole: jest.fn((_clientId: string, role: string, organizationId?: string) => {
        if (role === 'ADMIN') return policy.admin === true;
        if (role === 'SYSTEM') return policy.system === true;
        if (role === 'ORGANIZATION_ADMIN') {
          return !!organizationId && orgAdminOf.indexOf(organizationId) >= 0;
        }
        if (role === 'USER') return true;
        return false;
      }),
      hasAnyRole: jest.fn(() => true),
    },
    partner: { _id: partnerId },
    // Used by the `@roles` decorator, which checks the coarse role only.
    hasRole: jest.fn(
      (role: string) =>
        role === 'USER' ||
        (role === 'ADMIN' && policy.admin === true) ||
        (role === 'SYSTEM' && policy.system === true) ||
        (role === 'ORGANIZATION_ADMIN' && orgAdminOf.length > 0),
    ),
    hasAnyRole: jest.fn(() => true),
    log: jest.fn(),
    error: jest.fn(),
    getService: jest.fn(),
  };

  return context;
};

/** Stand-in for a hydrated Organization document. */
const makeOrganization = (overrides: Record<string, any> = {}): any => ({
  _id: new ObjectId(),
  name: 'Acme',
  code: 'ACME',
  tradingName: 'Acme Trading',
  description: null,
  status: 'active',
  theme: undefined,
  themeMode: 'dark',
  public: false,
  avatar: null,
  settings: [],
  themes: [{ name: 'acme', type: 'material' }],
  save: jest.fn().mockResolvedValue(undefined),
  markModified: jest.fn(),
  setSetting: jest.fn(),
  ...overrides,
});

/** Stand-in for a hydrated User document. */
const makeUser = (overrides: Record<string, any> = {}): any => ({
  _id: new ObjectId(),
  memberships: [],
  save: jest.fn().mockResolvedValue(undefined),
  markModified: jest.fn(),
  getMembership: jest.fn(() => null),
  ...overrides,
});

describe('OrganizationService org-scoped authorization (ORG-005)', () => {
  let organizationA: any;
  let organizationB: any;
  let member: any;
  let previousRoot: string | undefined;
  let dataRoot: string;

  beforeEach(() => {
    jest.clearAllMocks();

    previousRoot = process.env.APP_DATA_ROOT;
    dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-org-auth-'));
    process.env.APP_DATA_ROOT = dataRoot;

    organizationA = makeOrganization();
    organizationB = makeOrganization();
    member = makeUser();

    models.Organization.mockImplementation((doc: any) => ({
      ...doc,
      setSetting: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    }));

    models.Organization.findById.mockImplementation((id: any) => {
      const key = `${id}`;
      if (key === `${organizationA._id}`) return Promise.resolve(organizationA);
      if (key === `${organizationB._id}`) return Promise.resolve(organizationB);
      return Promise.resolve(null);
    });
    models.Organization.countDocuments.mockResolvedValue(1);
    models.User.findById.mockResolvedValue(member);
    models.Organization.find.mockReturnValue({ sort: jest.fn(), then: jest.fn() });
  });

  afterEach(() => {
    if (previousRoot === undefined) delete process.env.APP_DATA_ROOT;
    else process.env.APP_DATA_ROOT = previousRoot;
    (fs as any).rmSync(dataRoot, { recursive: true, force: true });
  });

  const service = (policy: IRolePolicy) => new OrganizationService({}, makeContext(policy));

  /**
   * The `@roles` guard throws synchronously, before a promise is returned, so
   * the call is wrapped to assert a rejection in either case.
   */
  const expectRejection = async (call: () => Promise<any>, matcher: RegExp): Promise<void> => {
    await expect(Promise.resolve().then(call)).rejects.toThrow(matcher);
  };

  type MutationCase = [string, (svc: any, id: string) => Promise<any>];

  /** Every organization-scoped mutation that ORG-005 must gate. */
  const mutationCases: MutationCase[] = [
    ['updateOrganization', (svc, id) => svc.updateOrganization(id, { name: 'Renamed' })],
    ['setOrganization', (svc, id) => svc.setOrganization(id, { name: 'Renamed' })],
    ['archiveOrganization', (svc, id) => svc.archiveOrganization(id)],
    ['restoreOrganization', (svc, id) => svc.restoreOrganization(id)],
    ['setSetting', (svc, id) => svc.setSetting(id, 'color', { primary: '#fff' })],
    ['removeSetting', (svc, id) => svc.removeSetting(id, 'color')],
    ['addMember', (svc, id) => svc.addMember(id, `${member._id}`, ['USER'])],
    ['removeMember', (svc, id) => svc.removeMember(id, `${member._id}`)],
    ['setMemberRoles', (svc, id) => svc.setMemberRoles(id, `${member._id}`, ['USER'])],
    ['saveTheme', (svc, id) => svc.saveTheme(id, { name: 'acme' })],
    ['setActiveTheme', (svc, id) => svc.setActiveTheme(id, 'acme')],
    ['deleteTheme', (svc, id) => svc.deleteTheme(id, 'acme')],
    ['publishThemeCss', (svc, id) => svc.publishThemeCss(id, 'acme', 'body {}')],
  ];

  describe('plain USER', () => {
    it.each(mutationCases)('denies a plain USER for %s', async (_name, call) => {
      const svc = service({});

      await expectRejection(() => call(svc, `${organizationA._id}`), /permission/i);

      expect(organizationA.save).not.toHaveBeenCalled();
    });
  });

  describe('platform ADMIN', () => {
    it.each(mutationCases)('allows an ADMIN to %s any organization', async (_name, call) => {
      const svc = service({ admin: true });

      await expect(call(svc, `${organizationB._id}`)).resolves.toBeDefined();
    });
  });

  describe('ORGANIZATION_ADMIN scoping - the core requirement', () => {
    it.each(mutationCases)('allows an ORGANIZATION_ADMIN of A to %s on A', async (_name, call) => {
      const svc = service({ orgAdminOf: [`${organizationA._id}`] });

      await expect(call(svc, `${organizationA._id}`)).resolves.toBeDefined();
    });

    it.each(mutationCases)('denies an ORGANIZATION_ADMIN of A for %s on B', async (_name, call) => {
      const svc = service({ orgAdminOf: [`${organizationA._id}`] });

      await expectRejection(() => call(svc, `${organizationB._id}`), /permission/i);

      expect(organizationB.save).not.toHaveBeenCalled();
    });
  });

  describe('guards that must never fall through', () => {
    it('denies an unauthenticated caller', async () => {
      const context = makeContext({ admin: true });
      context.user = null;
      const svc = new OrganizationService({}, context);

      await expectRejection(
        () => svc.updateOrganization(`${organizationA._id}`, { name: 'Renamed' }),
        /no user|authenticated/i,
      );
    });

    it('denies a caller with no partner context', async () => {
      const context = makeContext({ admin: true });
      context.partner = null;
      const svc = new OrganizationService({}, context);

      await expectRejection(
        () => svc.updateOrganization(`${organizationA._id}`, { name: 'Renamed' }),
        /partner/i,
      );
    });

    it('rejects an invalid organization id instead of treating it as a client-wide role', async () => {
      const svc = service({ orgAdminOf: [`${organizationA._id}`] });

      await expect(svc.archiveOrganization('not-an-object-id')).rejects.toThrow(/not a valid/);
    });
  });

  describe('createOrganization', () => {
    const input = { name: 'New Co', code: 'NEW' };

    it('denies a plain USER', async () => {
      await expectRejection(() => service({}).create('New Co', input), /permission/i);
    });

    it('denies an ORGANIZATION_ADMIN', async () => {
      await expectRejection(
        () => service({ orgAdminOf: [`${organizationA._id}`] }).create('New Co', input),
        /permission/i,
      );
    });

    it('allows an ADMIN and applies the initial identity fields', async () => {
      const organization = await service({ admin: true }).create('New Co', input);

      expect(organization.name).toBe('New Co');
      expect(organization.code).toBe('NEW');
      expect(organization.save).toHaveBeenCalled();
    });

    it('allows the SYSTEM account', async () => {
      await expect(service({ system: true }).create('New Co', input)).resolves.toBeDefined();
    });

    it('rejects an empty name', async () => {
      await expect(service({ admin: true }).create('   ')).rejects.toThrow(/name is required/i);
    });
  });
});

describe('OrganizationService organization surface (ORG-005)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.Organization.countDocuments.mockResolvedValue(1);
    models.Organization.findById.mockResolvedValue(null);
  });

  const adminService = () => new OrganizationService({}, makeContext({ admin: true }));

  describe('updateOrganization', () => {
    it('applies every identity field and allows clearing optional ones', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      await adminService().updateOrganization(`${organization._id}`, {
        name: 'Acme Holdings',
        code: null,
        tradingName: 'Acme Trading Co',
        legalName: 'Acme Holdings (Pty) Ltd',
        description: 'Holding company',
        website: 'https://acme.example',
        contactEmail: 'hello@acme.example',
        contactPhone: '+27 11 000 0000',
        status: 'suspended',
        theme: 'acme',
        themeMode: 'light',
        public: true,
        avatar: 'avatar_acme.png',
        legacyId: 42,
      } as any);

      expect(organization.name).toBe('Acme Holdings');
      expect(organization.code).toBeNull();
      expect(organization.tradingName).toBe('Acme Trading Co');
      expect(organization.legalName).toBe('Acme Holdings (Pty) Ltd');
      expect(organization.description).toBe('Holding company');
      expect(organization.website).toBe('https://acme.example');
      expect(organization.contactEmail).toBe('hello@acme.example');
      expect(organization.contactPhone).toBe('+27 11 000 0000');
      expect(organization.status).toBe('suspended');
      expect(organization.theme).toBe('acme');
      expect(organization.themeMode).toBe('light');
      expect(organization.public).toBe(true);
      expect(organization.avatar).toBe('avatar_acme.png');
      expect(organization.legacyId).toBe('42');
      expect(organization.save).toHaveBeenCalledTimes(1);
    });

    it('leaves unspecified fields untouched', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      await adminService().updateOrganization(`${organization._id}`, { description: 'Only this' });

      expect(organization.description).toBe('Only this');
      expect(organization.name).toBe('Acme');
      expect(organization.code).toBe('ACME');
    });

    it('rejects an unknown lifecycle status', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      await expect(
        adminService().updateOrganization(`${organization._id}`, { status: 'deleted' } as any),
      ).rejects.toThrow(/status must be one of/i);
      expect(organization.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown theme mode', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      await expect(
        adminService().updateOrganization(`${organization._id}`, { themeMode: 'sepia' } as any),
      ).rejects.toThrow(/theme mode must be one of/i);
      expect(organization.save).not.toHaveBeenCalled();
    });
  });

  describe('archiveOrganization / restoreOrganization', () => {
    it('archives without deleting the record', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      const result = await adminService().archiveOrganization(`${organization._id}`);

      expect(result.status).toBe('archived');
      expect((result as any).deleted).toBeUndefined();
      expect(organization.save).toHaveBeenCalledTimes(1);
    });

    it('restores an archived organization to active', async () => {
      const organization = makeOrganization({ status: 'archived' });
      models.Organization.findById.mockResolvedValue(organization);

      const result = await adminService().restoreOrganization(`${organization._id}`);

      expect(result.status).toBe('active');
      expect(organization.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatistics', () => {
    it('returns the three counts from one bounded round of queries', async () => {
      models.Organization.countDocuments.mockResolvedValue(1);
      models.User.countDocuments.mockResolvedValue(7);
      models.BusinessUnit.countDocuments.mockResolvedValue(3);
      models.Team.countDocuments.mockResolvedValue(5);

      const organizationId = `${new ObjectId()}`;
      const result = await adminService().getStatistics(organizationId);

      expect(result).toEqual({ members: 7, businessUnits: 3, teams: 5 });
      expect(models.Organization.countDocuments).toHaveBeenCalledTimes(1);
      expect(models.User.countDocuments).toHaveBeenCalledTimes(1);
      expect(models.BusinessUnit.countDocuments).toHaveBeenCalledTimes(1);
      expect(models.Team.countDocuments).toHaveBeenCalledTimes(1);
      // No per-row lookups: statistics must not fetch the organization document
      // or iterate members/teams.
      expect(models.Organization.findById).not.toHaveBeenCalled();
      expect(models.User.findById).not.toHaveBeenCalled();
      expect(models.Team.find).not.toHaveBeenCalled();
    });

    it('rejects an organization that does not exist', async () => {
      models.Organization.countDocuments.mockResolvedValue(0);
      models.User.countDocuments.mockResolvedValue(0);
      models.BusinessUnit.countDocuments.mockResolvedValue(0);
      models.Team.countDocuments.mockResolvedValue(0);

      await expect(adminService().getStatistics(`${new ObjectId()}`)).rejects.toThrow(
        /could not be found/,
      );
    });
  });

  describe('settings round-trip', () => {
    /**
     * Uses the real Organization model so `setSetting` is the production
     * implementation - in particular the first-write path that ORG-002 fixed.
     */
    const realOrganizationModel = () =>
      jest.requireActual('@reactory/server-modules/reactory-core/models/Organization').default;

    it('writes the first setting, reads it back and removes it', async () => {
      const RealOrganization = realOrganizationModel();
      const document: any = new RealOrganization({ name: 'Acme' });
      document.save = jest.fn().mockResolvedValue(document);
      expect(document.settings).toHaveLength(0);

      models.Organization.findById.mockResolvedValue(document);
      const svc = adminService();

      await svc.setSetting(`${document._id}`, 'color', { primary: '#fff' }, 'core.Picker');
      expect(document.settings).toHaveLength(1);
      expect(document.settings[0]).toMatchObject({
        name: 'color',
        data: { primary: '#fff' },
        componentFqn: 'core.Picker',
      });

      const settings = await svc.getSettings(`${document._id}`);
      expect(settings).toHaveLength(1);
      expect(settings[0].name).toBe('color');

      await svc.setSetting(`${document._id}`, 'color', { primary: '#000' }, 'core.Picker');
      expect(document.settings).toHaveLength(1);
      expect(document.settings[0].data).toEqual({ primary: '#000' });

      await svc.removeSetting(`${document._id}`, 'color');
      expect(document.settings).toHaveLength(0);
    });

    it('requires a setting name', async () => {
      await expect(adminService().setSetting(`${new ObjectId()}`, '  ', {})).rejects.toThrow(
        /setting name is required/i,
      );
    });
  });

  describe('membership', () => {
    it('creates a membership keyed by client and organization', async () => {
      const organization = makeOrganization();
      const user = makeUser();
      models.Organization.findById.mockResolvedValue(organization);
      models.User.findById.mockResolvedValue(user);

      const context = makeContext({ admin: true });
      const svc = new OrganizationService({}, context);

      await svc.addMember(`${organization._id}`, `${user._id}`, ['USER', 'TEAM_ADMIN']);

      expect(user.memberships).toHaveLength(1);
      expect(user.memberships[0]).toMatchObject({
        clientId: context.partner._id,
        organizationId: organization._id,
        roles: ['USER', 'TEAM_ADMIN'],
        enabled: true,
      });
      expect(user.save).toHaveBeenCalledTimes(1);
    });

    it('unions roles when the user is already a member', async () => {
      const organization = makeOrganization();
      const membership = { roles: ['USER'], enabled: false };
      const user = makeUser({ memberships: [membership], getMembership: jest.fn(() => membership) });
      models.Organization.findById.mockResolvedValue(organization);
      models.User.findById.mockResolvedValue(user);

      await adminService().addMember(`${organization._id}`, `${user._id}`, ['ORGANIZATION_ADMIN']);

      expect(membership.roles).toEqual(['USER', 'ORGANIZATION_ADMIN']);
      expect(membership.enabled).toBe(true);
      expect(user.memberships).toHaveLength(1);
    });

    it('replaces the roles for a member', async () => {
      const organization = makeOrganization();
      const membership = { roles: ['USER'] };
      const user = makeUser({ memberships: [membership], getMembership: jest.fn(() => membership) });
      models.Organization.findById.mockResolvedValue(organization);
      models.User.findById.mockResolvedValue(user);

      await adminService().setMemberRoles(`${organization._id}`, `${user._id}`, ['TEAM_ADMIN']);

      expect(membership.roles).toEqual(['TEAM_ADMIN']);
    });

    it('removes only the membership for this organization', async () => {
      const organization = makeOrganization();
      const otherMembership = {
        clientId: new ObjectId(),
        organizationId: new ObjectId(),
        roles: ['USER'],
      };
      const membership = {
        clientId: new ObjectId(),
        organizationId: organization._id,
        roles: ['USER'],
      };
      const user = makeUser({ memberships: [membership, otherMembership] });
      models.Organization.findById.mockResolvedValue(organization);
      models.User.findById.mockResolvedValue(user);

      const context = makeContext({ admin: true });
      const svc = new OrganizationService({}, context);
      // The membership must belong to the caller's partner for removal to match.
      membership.clientId = new ObjectId(`${context.partner._id}`);
      otherMembership.clientId = new ObjectId(`${context.partner._id}`);

      await svc.removeMember(`${organization._id}`, `${user._id}`);

      expect(user.memberships).toHaveLength(1);
      expect(user.memberships[0]).toBe(otherMembership);
      expect(user.save).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown user', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);
      models.User.findById.mockResolvedValue(null);

      await expect(
        adminService().addMember(`${organization._id}`, `${new ObjectId()}`, ['USER']),
      ).rejects.toThrow(/not found/);
    });
  });
});

describe('OrganizationService getOrganizationsForLoggedInUser sorting (ORG-005)', () => {
  /**
   * Minimal stand-in for a Mongoose query: records the sort specification and
   * applies it when awaited, so an assertion on the resulting order proves both
   * the field and the direction were used.
   */
  const makeQuery = (rows: any[]) => {
    let spec: Record<string, number> = {};
    const query: any = {
      sort: jest.fn((value: Record<string, number>) => {
        spec = value;
        return query;
      }),
      then: (resolve: any) => {
        const field = Object.keys(spec)[0];
        const direction = spec[field];
        const sorted = [...rows].sort((left, right) => {
          if (left[field] === right[field]) return 0;
          return (left[field] > right[field] ? 1 : -1) * direction;
        });
        return Promise.resolve(sorted).then(resolve);
      },
    };
    return query;
  };

  const rows = (): any[] => [{ name: 'Zulu' }, { name: 'Alpha' }, { name: 'Mike' }];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sorts by name ascending for a platform admin', async () => {
    const query = makeQuery(rows());
    models.Organization.find.mockReturnValue(query);

    const svc = new OrganizationService({}, makeContext({ admin: true }));
    const result: any[] = await svc.getOrganizationsForLoggedInUser('', 'name', 'asc');

    expect(query.sort).toHaveBeenCalledWith({ name: 1 });
    expect(result.map((organization) => organization.name)).toEqual(['Alpha', 'Mike', 'Zulu']);
  });

  it('sorts by name descending for a platform admin', async () => {
    const query = makeQuery(rows());
    models.Organization.find.mockReturnValue(query);

    const svc = new OrganizationService({}, makeContext({ admin: true }));
    const result: any[] = await svc.getOrganizationsForLoggedInUser('', 'name', 'desc');

    expect(query.sort).toHaveBeenCalledWith({ name: -1 });
    expect(result.map((organization) => organization.name)).toEqual(['Zulu', 'Mike', 'Alpha']);
  });

  it('applies the direction on the membership path too', async () => {
    const context = makeContext({ orgAdminOf: [`${new ObjectId()}`] });
    context.user.memberships = [
      {
        clientId: new ObjectId(`${context.partner._id}`),
        organizationId: new ObjectId(),
      },
    ];

    const query = makeQuery(rows());
    models.Organization.find.mockReturnValue(query);

    const svc = new OrganizationService({}, context);
    const result: any[] = await svc.getOrganizationsForLoggedInUser('', 'name', 'desc');

    expect(query.sort).toHaveBeenCalledWith({ name: -1 });
    expect(result.map((organization) => organization.name)).toEqual(['Zulu', 'Mike', 'Alpha']);
  });
});
