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
 * The REAL `User` model.
 *
 * The authorization matrix must run against the shipped `hasRole`
 * implementation, not a hand-rolled mock that encodes the intended semantics.
 * A mock previously hid a cross-tenant bypass: `UserSchema.methods.hasRole`
 * ends with an unconditional document-level fallback
 * (`this.roles.includes(role)`), so a user whose document-level roles contain
 * ORGANIZATION_ADMIN passes the scoped query for EVERY organization.
 */
const RealUserModel = jest.requireActual(
  '@reactory/server-modules/reactory-core/models/User',
).default;

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
 * Builds an execution context around a REAL `User` document.
 *
 * `memberships` carries one client-level USER membership plus one membership
 * per organization the caller administers. The document-level `roles` array
 * deliberately reproduces the shape `UserService.createUserForOrganization`
 * writes (`foundUser.roles = union(foundUser.roles, effectiveRoles)`): an
 * ORGANIZATION_ADMIN caller therefore ALSO carries ORGANIZATION_ADMIN on the
 * user document.
 *
 * That shape is not incidental - it is the one that defeated the original
 * `user.hasRole(partnerId, 'ORGANIZATION_ADMIN', orgId)` check, because
 * `UserSchema.methods.hasRole` ends with an unconditional document-level
 * fallback. Using the real model here means the tests fail if the service ever
 * goes back to relying on that query.
 */
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
  // Never touch a database: every write in this suite is asserted through the
  // mock, and the context user is never persisted.
  user.save = jest.fn().mockResolvedValue(user);

  const context: any = {
    user,
    partner: { _id: partnerId },
    // Used by the coarse `@roles` decorator, which never sees an organization.
    hasRole: jest.fn((role: string) => documentRoles.indexOf(role) >= 0),
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

  /**
   * The model-level hazard behind F1, pinned with the REAL `User` document.
   *
   * `UserSchema.methods.hasRole` ends with a document-level fallback, and
   * `UserService.createUserForOrganization` copies membership roles into
   * `user.roles`. A caller provisioned as an organization administrator
   * therefore satisfies `hasRole(partner, 'ORGANIZATION_ADMIN', anyOrgId)` for
   * every organization. The first assertion documents that (so the test cannot
   * silently become meaningless); the rest prove that the service no longer
   * trusts that query and denies the cross-organization call.
   */
  describe('real User model - document-level roles cannot cross organizations (F1)', () => {
    it('documents that the model reports the role for every organization', () => {
      const context = makeContext({ orgAdminOf: [`${organizationA._id}`] });

      expect(context.user.roles).toContain('ORGANIZATION_ADMIN');
      expect(
        context.user.hasRole(`${context.partner._id}`, 'ORGANIZATION_ADMIN', `${organizationA._id}`),
      ).toBe(true);
      // If this ever becomes false the model was fixed upstream; the service
      // check below remains correct either way.
      expect(
        context.user.hasRole(`${context.partner._id}`, 'ORGANIZATION_ADMIN', `${organizationB._id}`),
      ).toBe(true);
    });

    it('denies setOrganization on organization B and never persists B', async () => {
      const context = makeContext({ orgAdminOf: [`${organizationA._id}`] });
      const svc = new OrganizationService({}, context);

      await expectRejection(
        () => svc.setOrganization(`${organizationB._id}`, { name: 'Hijacked' }),
        /permission/i,
      );

      expect(organizationB.name).toBe('Acme');
      expect(organizationB.save).not.toHaveBeenCalled();
    });

    it('still allows the same caller on organization A', async () => {
      const context = makeContext({ orgAdminOf: [`${organizationA._id}`] });
      const svc = new OrganizationService({}, context);

      await svc.setOrganization(`${organizationA._id}`, { name: 'Acme Holdings' });

      expect(organizationA.name).toBe('Acme Holdings');
      expect(organizationA.save).toHaveBeenCalledTimes(1);
      expect(organizationB.save).not.toHaveBeenCalled();
    });

    it('grants nothing to a business-unit membership on the same organization', async () => {
      const context = makeContext({ orgAdminOf: [`${organizationA._id}`] });
      const svc = new OrganizationService({}, context);
      context.user.memberships = [
        {
          clientId: context.partner._id,
          organizationId: organizationA._id,
          businessUnitId: new ObjectId(),
          roles: ['USER', 'ORGANIZATION_ADMIN'],
          enabled: true,
        },
      ];

      await expectRejection(
        () => svc.setOrganization(`${organizationA._id}`, { name: 'Renamed' }),
        /permission/i,
      );
      expect(organizationA.save).not.toHaveBeenCalled();
    });

    it('grants nothing to an explicitly disabled membership', async () => {
      const context = makeContext({ orgAdminOf: [`${organizationA._id}`] });
      const svc = new OrganizationService({}, context);
      context.user.memberships = [
        {
          clientId: context.partner._id,
          organizationId: organizationA._id,
          businessUnitId: null,
          roles: ['USER', 'ORGANIZATION_ADMIN'],
          enabled: false,
        },
      ];

      await expectRejection(
        () => svc.setOrganization(`${organizationA._id}`, { name: 'Renamed' }),
        /permission/i,
      );
      expect(organizationA.save).not.toHaveBeenCalled();
    });
  });

  describe('uploadOrganizationImage is org-scoped too', () => {
    const file = { filename: 'logo.png' } as any;

    it('denies an ORGANIZATION_ADMIN of A on B and never persists B', async () => {
      const svc = service({ orgAdminOf: [`${organizationA._id}`] });

      await expectRejection(
        () => svc.uploadOrganizationImage(`${organizationB._id}`, file, 'logo'),
        /permission/i,
      );

      expect(models.Organization.findById).not.toHaveBeenCalled();
      expect(organizationB.save).not.toHaveBeenCalled();
    });

    it('denies a plain USER', async () => {
      const svc = service({});

      await expectRejection(
        () => svc.uploadOrganizationImage(`${organizationA._id}`, file, 'logo'),
        /permission/i,
      );
      expect(organizationA.save).not.toHaveBeenCalled();
    });

    it('stores the alias for an ADMIN', async () => {
      const context = makeContext({ admin: true });
      const uploadFile = jest.fn().mockResolvedValue({ alias: 'logo_new.png' });
      context.getService = jest.fn(() => ({ uploadFile }));
      const svc = new OrganizationService({}, context);

      const result: any = await svc.uploadOrganizationImage(
        `${organizationA._id}`,
        file,
        'logo',
      );

      expect(result.logo).toBe('logo_new.png');
      expect(organizationA.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('guards that must never fall through', () => {
    // Called directly: the coarse `@roles` decorator would otherwise reject
    // first and the helper's own guards would never execute.
    const assertOrgAdmin = (svc: any, organizationId: any, context: any) =>
      svc.assertOrgAdmin(organizationId, context);

    it('denies an unauthenticated caller', () => {
      const context = makeContext({ admin: true });
      context.user = null;

      expect(() =>
        assertOrgAdmin(service({ admin: true }), `${organizationA._id}`, context),
      ).toThrow(/authenticated/i);
    });

    it('denies a user document without an id', () => {
      // A malformed context: an authenticated-looking user object that carries
      // no id. Mongoose re-hydrates `_id`, so a plain object is used to model
      // the shape this guard has to survive.
      const context: any = {
        user: { hasRole: jest.fn(() => true), hasAnyRole: jest.fn(() => true), memberships: [] },
        partner: { _id: new ObjectId() },
        hasRole: jest.fn(() => true),
        log: jest.fn(),
      };

      expect(() =>
        assertOrgAdmin(service({ admin: true }), `${organizationA._id}`, context),
      ).toThrow(/authenticated/i);
    });

    it('denies a caller with no partner context', () => {
      const context = makeContext({ admin: true });
      context.partner = null;

      expect(() =>
        assertOrgAdmin(service({ admin: true }), `${organizationA._id}`, context),
      ).toThrow(/partner/i);
    });

    it('rejects an invalid organization id instead of treating it as a client-wide role', () => {
      const context = makeContext({ orgAdminOf: [`${organizationA._id}`] });
      const svc = service({ orgAdminOf: [`${organizationA._id}`] });

      expect(() => assertOrgAdmin(svc, 'not-an-object-id', context)).toThrow(/not a valid/);
      expect(() => assertOrgAdmin(svc, null, context)).toThrow(/not a valid/);
    });

    it('admits an ADMIN and denies a USER for the same organization', () => {
      expect(() =>
        assertOrgAdmin(
          service({ admin: true }),
          `${organizationA._id}`,
          makeContext({ admin: true }),
        ),
      ).not.toThrow();

      expect(() =>
        assertOrgAdmin(service({}), `${organizationA._id}`, makeContext({})),
      ).toThrow(/permission/i);
    });

    it('propagates through the public mutations for a missing context', async () => {
      const context = makeContext({ admin: true });
      context.user = null;
      const svc = new OrganizationService({}, context);

      await expectRejection(
        () => svc.updateOrganization(`${organizationA._id}`, { name: 'Renamed' }),
        /no user|authenticated/i,
      );
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

  describe('guards, validation and edge cases', () => {
    it('getSettings rejects an unknown organization', async () => {
      models.Organization.findById.mockResolvedValue(null);

      await expect(adminService().getSettings(`${new ObjectId()}`)).rejects.toThrow(
        /could not be found/,
      );
    });

    it('getSettings rejects an invalid id', async () => {
      await expect(adminService().getSettings('nope')).rejects.toThrow(/not a valid/);
    });

    it('getSettings returns an empty list when the organization has no settings', async () => {
      const organization = makeOrganization({ settings: undefined });
      models.Organization.findById.mockResolvedValue(organization);

      await expect(adminService().getSettings(`${organization._id}`)).resolves.toEqual([]);
    });

    it('removeSetting requires a setting name', async () => {
      await expect(adminService().removeSetting(`${new ObjectId()}`, '   ')).rejects.toThrow(
        /setting name is required/i,
      );
    });

    it('removeSetting is a no-op for an absent setting', async () => {
      const organization = makeOrganization({ settings: [{ name: 'other', data: {} }] });
      models.Organization.findById.mockResolvedValue(organization);

      await adminService().removeSetting(`${organization._id}`, 'color');

      expect(organization.settings).toHaveLength(1);
      expect(organization.settings[0].name).toBe('other');
      expect(organization.save).toHaveBeenCalledTimes(1);
    });

    it('getStatistics rejects an invalid id', async () => {
      await expect(adminService().getStatistics('nope')).rejects.toThrow(/not a valid/);
    });

    it('addMember rejects an invalid user id', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      await expect(
        adminService().addMember(`${organization._id}`, 'not-an-object-id', ['USER']),
      ).rejects.toThrow(/userId is not a valid/);
    });

    it('removeMember rejects an invalid user id', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      await expect(
        adminService().removeMember(`${organization._id}`, 'not-an-object-id'),
      ).rejects.toThrow(/userId is not a valid/);
    });

    it('applies a settings array passed through updateOrganization', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);
      const settings = [{ name: 'color', data: { primary: '#123' } }];

      await adminService().updateOrganization(`${organization._id}`, { settings } as any);

      expect(organization.settings).toEqual(settings);
      expect(organization.save).toHaveBeenCalledTimes(1);
    });

    it('clears the public flag and legacyId when explicitly set to null', async () => {
      const organization = makeOrganization({ public: true, legacyId: '7' });
      models.Organization.findById.mockResolvedValue(organization);

      await adminService().updateOrganization(`${organization._id}`, {
        public: false,
        legacyId: null,
      } as any);

      expect(organization.public).toBe(false);
      expect(organization.legacyId).toBeNull();
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
        roles: ['USER'],
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
