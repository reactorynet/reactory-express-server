import moment from 'moment';
import { ObjectId } from 'mongodb';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';
import OrganizationResolver from '../Organization';

/**
 * `MergeGraphResolvers` harvests resolvers from the class prototype and merges
 * the decorator-built map into a plain object, so every resolver runs detached
 * from the class instance. These tests reproduce that shape.
 */
const harvest = () => {
  const instance: any = Object.create((OrganizationResolver as any).prototype);
  const map = instance.resolver;
  return {
    Query: { ...map.Query },
    Mutation: { ...map.Mutation },
    Organization: { ...(map.Organization || {}) },
  };
};

const makeContext = (roles: string[]) => {
  const organization = { _id: new ObjectId(), name: 'Acme' };
  const organizationService = {
    create: jest.fn().mockResolvedValue(organization),
    setOrganization: jest.fn().mockResolvedValue(organization),
    updateOrganization: jest.fn().mockResolvedValue(organization),
    archiveOrganization: jest.fn().mockResolvedValue({ ...organization, status: 'archived' }),
    restoreOrganization: jest.fn().mockResolvedValue({ ...organization, status: 'active' }),
    setSetting: jest.fn().mockResolvedValue(organization),
    removeSetting: jest.fn().mockResolvedValue(organization),
    addMember: jest.fn().mockResolvedValue(organization),
    removeMember: jest.fn().mockResolvedValue(organization),
    setMemberRoles: jest.fn().mockResolvedValue(organization),
    getStatistics: jest.fn().mockResolvedValue({ members: 2, businessUnits: 3, teams: 4 }),
  };

  const context: any = {
    user: {
      _id: new ObjectId(),
      email: 'operator@reactory.net',
      // The resolver only consults the COARSE context gate; the service (which
      // is mocked here) performs the org-scoped check. Organization-scoping
      // itself is covered against the real User model in
      // services/__tests__/OrganizationAuthorization.test.ts.
      hasRole: jest.fn((_clientId: string, role: string) => roles.indexOf(role) >= 0),
    },
    partner: { _id: new ObjectId() },
    hasRole: jest.fn((role: string) => roles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => roles.length > 0),
    getService: jest.fn(() => organizationService),
    log: jest.fn(),
  };

  return { context, organizationService };
};

describe('OrganizationResolver organization mutations (ORG-002)', () => {
  it('denies createOrganization to an unrestricted USER', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER']);

    // The @roles guard throws synchronously, so the call is wrapped.
    expect(() =>
      map.Mutation.createOrganization(null, { input: { name: 'Acme' } }, context, {})
    ).toThrow(/permissions/i);

    expect(organizationService.create).not.toHaveBeenCalled();
  });

  it('denies createOrganization to an ORGANIZATION_ADMIN (ORG-005: they only administer their own organization)', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ORGANIZATION_ADMIN']);

    expect(() =>
      map.Mutation.createOrganization(null, { input: { name: 'Acme' } }, context, {})
    ).toThrow(/permissions/i);

    expect(organizationService.create).not.toHaveBeenCalled();
  });

  it('allows an ADMIN to create an organization and passes the full input once', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ADMIN']);
    const input = { name: 'Acme', code: 'ACME' };

    await map.Mutation.createOrganization(null, { input }, context, {});

    expect(organizationService.create).toHaveBeenCalledWith('Acme', input, context);
    expect(organizationService.setOrganization).not.toHaveBeenCalled();
  });

  it('denies updateOrganization to an unrestricted USER', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER']);
    const id = new ObjectId().toString();

    expect(() =>
      map.Mutation.updateOrganization(null, { id, input: { name: 'Renamed' } }, context, {})
    ).toThrow(/permissions/i);

    expect(organizationService.setOrganization).not.toHaveBeenCalled();
  });

  it('allows an ADMIN to update an organization', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ADMIN']);
    const id = new ObjectId().toString();

    await map.Mutation.updateOrganization(null, { id, input: { name: 'Renamed' } }, context, {});

    expect(organizationService.updateOrganization).toHaveBeenCalledWith(
      id,
      { name: 'Renamed' },
      context,
    );
  });
});

describe('OrganizationResolver org-scoped mutations (ORG-005)', () => {
  type MutationCase = [string, Record<string, unknown>, string];
  const mutationCases: MutationCase[] = [
    ['archiveOrganization', { id: 'org-1' }, 'archiveOrganization'],
    ['restoreOrganization', { id: 'org-1' }, 'restoreOrganization'],
    ['OrganizationSetSetting', { id: 'org-1', name: 'color', data: {} }, 'setSetting'],
    ['OrganizationRemoveSetting', { id: 'org-1', name: 'color' }, 'removeSetting'],
    ['addOrganizationMember', { id: 'org-1', userId: 'user-2', roles: ['USER'] }, 'addMember'],
    ['removeOrganizationMember', { id: 'org-1', userId: 'user-2' }, 'removeMember'],
    ['setOrganizationMemberRoles', { id: 'org-1', userId: 'user-2', roles: ['ADMIN'] }, 'setMemberRoles'],
  ];

  it.each(mutationCases)('denies a plain USER for %s', (mutation, args, serviceMethod) => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER']);

    // The @roles guard throws synchronously, so the call is wrapped.
    expect(() => map.Mutation[mutation](null, args, context, {})).toThrow(/permissions/i);
    expect((organizationService as any)[serviceMethod]).not.toHaveBeenCalled();
  });

  it.each(mutationCases)('delegates %s to the service for an ADMIN', async (mutation, args, serviceMethod) => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ADMIN']);

    await map.Mutation[mutation](null, args, context, {});

    expect((organizationService as any)[serviceMethod]).toHaveBeenCalled();
  });

  it('passes every setting argument through, including the execution context', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['ADMIN']);

    await map.Mutation.OrganizationSetSetting(
      null,
      { id: 'org-1', name: 'color', data: { primary: '#fff' }, componentFqn: 'core.Picker' },
      context,
      {},
    );

    expect(organizationService.setSetting).toHaveBeenCalledWith(
      'org-1',
      'color',
      { primary: '#fff' },
      'core.Picker',
      context,
    );
  });

  it('serves organization statistics through the query', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER']);

    await expect(
      map.Query.OrganizationStatistics(null, { id: 'org-1' }, context, {}),
    ).resolves.toEqual({ members: 2, businessUnits: 3, teams: 4 });
    expect(organizationService.getStatistics).toHaveBeenCalledWith('org-1');
  });

  it('denies statistics to an unauthenticated caller', () => {
    const map = harvest();
    const { context } = makeContext([]);
    context.user = null;

    expect(() =>
      map.Query.OrganizationStatistics(null, { id: 'org-1' }, context, {}),
    ).toThrow();
  });
});

describe('OrganizationResolver image URLs (ORG-002)', () => {
  const organizationId = new ObjectId();

  it('resolves logoURL with a valid cache-busting token', () => {
    const map = harvest();
    const url = map.Organization.logoURL({ _id: organizationId, logo: 'logo_default.png' });

    expect(url).toBe(
      safeCDNUrl(`organization/${organizationId}/logo_default.png?t=${moment().format('YYYYMMDDHH')}`)
    );
    expect(url).toMatch(/\/organization\/[a-f0-9]{24}\/logo_default\.png\?t=\d{10}$/);
    expect(url).not.toContain('YYYYMMDDHH');
    expect(url).not.toContain('YYYMMDDhh');
  });

  it('returns null for logoURL when the organization has no logo', () => {
    const map = harvest();
    expect(map.Organization.logoURL({ _id: organizationId })).toBeNull();
  });

  it('resolves avatarURL from the avatar alias', () => {
    const map = harvest();
    const url = map.Organization.avatarURL(
      { _id: organizationId, avatar: 'avatar_default.png', logo: 'logo_default.png' },
      {},
      {}
    );

    expect(url).toContain('avatar_default.png');
    expect(url).toMatch(/\?t=\d{10}$/);
  });

  it('falls back to the logo alias for avatarURL', () => {
    const map = harvest();
    const url = map.Organization.avatarURL(
      { _id: organizationId, logo: 'logo_default.png' },
      {},
      {}
    );

    expect(url).toContain('logo_default.png');
    expect(url).toMatch(/\?t=\d{10}$/);
  });
});
