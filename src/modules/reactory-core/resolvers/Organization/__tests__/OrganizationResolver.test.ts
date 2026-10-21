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
  const organizationService = {
    create: jest.fn().mockResolvedValue({ _id: new ObjectId(), name: 'Acme' }),
    setOrganization: jest.fn().mockResolvedValue({ _id: new ObjectId(), name: 'Acme' }),
  };

  const context: any = {
    user: { _id: new ObjectId(), email: 'operator@reactory.net' },
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

  it('allows an ORGANIZATION_ADMIN to create an organization', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ORGANIZATION_ADMIN']);

    await map.Mutation.createOrganization(
      null,
      { input: { name: 'Acme', code: 'ACME' } },
      context,
      {}
    );

    expect(organizationService.create).toHaveBeenCalledWith('Acme');
    expect(organizationService.setOrganization).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ code: 'ACME' })
    );
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

    expect(organizationService.setOrganization).toHaveBeenCalledWith(id, { name: 'Renamed' });
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
