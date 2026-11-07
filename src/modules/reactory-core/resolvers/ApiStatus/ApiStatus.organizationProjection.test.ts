/**
 * The `organization` projection on the status payload.
 *
 * `setActiveOrganization` writes `user.organization`; this is the read path a
 * client uses to see it. Both `ApiStatus.getApiStatus` and
 * `ApiStatus.loggedInContext` carry the bare ObjectId reference from the user
 * document, and `Organization.id` reads `_id` - so before these resolvers the
 * active organization reached the client as
 * `{ id: 'organization-no-id', name: null, logo: null }` (or as null), and no
 * status query could reflect a switch.
 *
 * The tests assert the projection returns a document whose `id` resolves, not
 * just that a lookup happened: that is the part that was broken.
 */
import { ObjectId } from 'mongodb';
import ApiStatusResolver from './ApiStatus';
import OrganizationResolver from '../Organization/Organization';
import MergeGraphResolvers from '@reactory/server-core/utils/graph/mergeResolver';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

jest.mock('@reactory/server-core/amq', () => ({
  raiseWorkFlowEvent: jest.fn(),
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  Organization: {},
  BusinessUnit: {},
  User: {},
}));

/** The decorator-built resolver map, as MergeGraphResolvers harvests it. */
const harvest = (): any => {
  const instance: any = Object.create((ApiStatusResolver as any).prototype);
  return instance.resolver;
};

const organizationId = new ObjectId();
const organizationDocumentRow = { _id: organizationId, name: 'Acme Holdings', logo: 'acme.png' };

const makeContext = () => {
  const findOrganizationById = jest.fn().mockResolvedValue(organizationDocumentRow);
  return {
    findOrganizationById,
    context: {
      getService: jest.fn(() => ({ findOrganizationById })),
    } as any,
  };
};

describe('ApiStatus organization projection', () => {
  it('loads the organization document for ApiStatus.organization', async () => {
    const { findOrganizationById, context } = makeContext();
    const resolver = harvest();

    const result = await resolver.ApiStatus.organization({ organization: organizationId }, {}, context);

    expect(findOrganizationById).toHaveBeenCalledWith(`${organizationId}`);
    expect(result).toBe(organizationDocumentRow);
  });

  it('loads the organization document for the loggedIn shortcut', async () => {
    const { findOrganizationById, context } = makeContext();
    const resolver = harvest();

    const result = await resolver.LoggedInContext.organization({ organization: organizationId }, {}, context);

    expect(findOrganizationById).toHaveBeenCalledWith(`${organizationId}`);
    expect(result).toBe(organizationDocumentRow);
  });

  it('returns an id the real Organization resolver can project', async () => {
    const { context } = makeContext();
    const resolver = harvest();
    const organizationResolvers = (MergeGraphResolvers([OrganizationResolver]) as Record<string, any>)
      .Organization as any;

    const result: any = await resolver.LoggedInContext.organization(
      { organization: organizationId },
      {},
      context,
    );

    // This is the assertion the old payload failed: a reference rendered as
    // 'organization-no-id' instead of the organization that is stored.
    expect(organizationResolvers.id(result)).toBe(`${organizationId}`);
    expect(result.name).toBe('Acme Holdings');
    expect(result.logo).toBe('acme.png');
  });

  it('returns null when the session has no active organization', async () => {
    const { findOrganizationById, context } = makeContext();
    const resolver = harvest();

    await expect(resolver.ApiStatus.organization({ organization: null }, {}, context)).resolves.toBeNull();
    await expect(resolver.LoggedInContext.organization({}, {}, context)).resolves.toBeNull();
    expect(findOrganizationById).not.toHaveBeenCalled();
  });

  it('passes an already-populated organization through without another lookup', async () => {
    const { findOrganizationById, context } = makeContext();
    const resolver = harvest();

    const result = await resolver.ApiStatus.organization(
      { organization: organizationDocumentRow },
      {},
      context,
    );

    expect(result).toBe(organizationDocumentRow);
    expect(findOrganizationById).not.toHaveBeenCalled();
  });
});
