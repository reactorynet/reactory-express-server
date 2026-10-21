import { ObjectId } from 'mongodb';
import ApiError from '@reactory/server-core/exceptions';
import { mergeGraphResolver } from '@reactory/server-core/utils';
import OrganizationResolver from '../Organization';

/**
 * `MergeGraphResolvers` harvests the decorated methods from the class
 * prototype into a plain map, so the tests call the harvested functions the
 * same way the GraphQL layer does.
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
  const organization = {
    _id: new ObjectId(),
    name: 'Acme',
    logo: 'logo_default.png',
    avatar: 'avatar_default.png',
  };
  const organizationService = {
    uploadOrganizationImage: jest.fn().mockResolvedValue(organization),
  };

  const context: any = {
    user: {
      _id: new ObjectId(),
      email: 'operator@reactory.net',
      // The resolver applies the COARSE role gate; the service (mocked here)
      // performs the org-scoped `assertOrgAdmin` check. That scoping is covered
      // against the real User model in
      // services/__tests__/OrganizationAuthorization.test.ts.
      hasRole: jest.fn((_clientId: string, role: string) => roles.indexOf(role) >= 0),
    },
    partner: { _id: new ObjectId() },
    hasRole: jest.fn((role: string) => roles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => roles.length > 0),
    getService: jest.fn(() => organizationService),
    log: jest.fn(),
  };

  return { context, organizationService, organization };
};

const uploadFile = (filename = 'logo.png') => ({
  filename,
  mimetype: 'image/png',
  encoding: '7bit',
  createReadStream: jest.fn(),
});

describe('OrganizationResolver OrganizationUploadImage (ORG-013a)', () => {
  it('is registered in the merged resolver map without clobbering existing mutations', () => {
    const merged: any = mergeGraphResolver([OrganizationResolver]);

    expect(merged.Mutation.OrganizationUploadImage).toBeDefined();
    expect(merged.Mutation.createOrganization).toBeDefined();
    expect(merged.Mutation.OrganizationSetSetting).toBeDefined();
    expect(merged.Organization.logoURL).toBeDefined();
  });

  it('delegates a logo upload to the service with the caller context', async () => {
    const map = harvest();
    const { context, organizationService, organization } = makeContext(['ORGANIZATION_ADMIN']);
    const file = uploadFile('logo.png');

    const result = await map.Mutation.OrganizationUploadImage(
      null,
      { id: 'org-1', imageType: 'logo', file },
      context,
      {},
    );

    expect(organizationService.uploadOrganizationImage).toHaveBeenCalledTimes(1);
    expect(organizationService.uploadOrganizationImage).toHaveBeenCalledWith(
      'org-1',
      file,
      'logo',
      context,
    );
    expect(result).toBe(organization);
    expect(result.logo).toBe('logo_default.png');
  });

  it('delegates an avatar upload to the service with the caller context', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ADMIN']);
    const file = uploadFile('avatar.png');

    const result = await map.Mutation.OrganizationUploadImage(
      null,
      { id: 'org-1', imageType: 'avatar', file },
      context,
      {},
    );

    expect(organizationService.uploadOrganizationImage).toHaveBeenCalledWith(
      'org-1',
      file,
      'avatar',
      context,
    );
    expect(result.avatar).toBe('avatar_default.png');
  });

  it('rejects an invalid imageType with an ApiError before calling the service', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['ORGANIZATION_ADMIN']);
    const file = uploadFile('banner.png');

    await expect(
      map.Mutation.OrganizationUploadImage(
        null,
        { id: 'org-1', imageType: 'banner', file },
        context,
        {},
      ),
    ).rejects.toThrow(ApiError);

    await expect(
      map.Mutation.OrganizationUploadImage(
        null,
        { id: 'org-1', imageType: 'banner', file },
        context,
        {},
      ),
    ).rejects.toThrow(/Invalid imageType "banner"/);

    expect(organizationService.uploadOrganizationImage).not.toHaveBeenCalled();
  });

  it('rejects a missing imageType even for a SYSTEM caller', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['SYSTEM']);

    await expect(
      map.Mutation.OrganizationUploadImage(
        null,
        { id: 'org-1', imageType: undefined, file: uploadFile() },
        context,
        {},
      ),
    ).rejects.toThrow(ApiError);

    expect(organizationService.uploadOrganizationImage).not.toHaveBeenCalled();
  });

  it('denies a plain USER before any upload work happens', () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER']);

    // The @roles guard throws synchronously, so the call is wrapped.
    expect(() =>
      map.Mutation.OrganizationUploadImage(
        null,
        { id: 'org-1', imageType: 'logo', file: uploadFile() },
        context,
        {},
      ),
    ).toThrow(/permissions/i);

    expect(organizationService.uploadOrganizationImage).not.toHaveBeenCalled();
  });

  it('denies an unauthenticated caller', () => {
    const map = harvest();
    const { context } = makeContext([]);
    context.user = null;

    expect(() =>
      map.Mutation.OrganizationUploadImage(
        null,
        { id: 'org-1', imageType: 'logo', file: uploadFile() },
        context,
        {},
      ),
    ).toThrow();
  });
});
