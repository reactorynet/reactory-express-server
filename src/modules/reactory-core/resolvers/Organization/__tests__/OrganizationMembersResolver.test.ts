/**
 * Resolver wiring for the ORG-023 membership surface.
 *
 * The org-scoped authorization itself is exercised against the real User model
 * in `services/__tests__/OrganizationService.members.test.ts`; these tests only
 * prove the transport exists, applies the coarse gate and forwards every
 * argument (including the execution context) to the service.
 */
import { ObjectId } from 'mongodb';
import OrganizationResolver from '../Organization';

const harvest = () => {
  const instance: any = Object.create((OrganizationResolver as any).prototype);
  const map = instance.resolver;
  return {
    Query: { ...map.Query },
    Mutation: { ...map.Mutation },
  };
};

const makeContext = (roles: string[]) => {
  const organization = { _id: new ObjectId(), name: 'Acme' };
  const organizationService = {
    pagedOrganizationMembers: jest.fn().mockResolvedValue({
      paging: { page: 1, pageSize: 25, total: 0, pageCount: 0, hasNext: false },
      members: [],
    }),
    inviteOrganizationMember: jest.fn().mockResolvedValue({
      id: 'invitation-1',
      email: 'invitee@example.com',
      status: 'invited',
      invited: true,
    }),
    deactivateOrganizationMember: jest.fn().mockResolvedValue(organization),
  };

  const context: any = {
    user: {
      _id: new ObjectId(),
      email: 'operator@reactory.net',
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

describe('OrganizationResolver membership surface (ORG-023)', () => {
  it('exposes OrganizationMembers, inviteOrganizationMember and deactivateOrganizationMember', () => {
    const map = harvest();

    expect(map.Query.OrganizationMembers).toBeDefined();
    expect(map.Mutation.inviteOrganizationMember).toBeDefined();
    expect(map.Mutation.deactivateOrganizationMember).toBeDefined();
  });

  it('forwards OrganizationMembers arguments and the execution context', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ORGANIZATION_ADMIN']);
    const organizationId = new ObjectId().toString();
    const filter = { search: 'ada', role: 'ORGANIZATION_ADMIN', includeDeactivated: true };
    const paging = { page: 2, pageSize: 10 };

    await map.Query.OrganizationMembers(null, { organizationId, filter, paging }, context, {});

    expect(organizationService.pagedOrganizationMembers).toHaveBeenCalledWith(
      organizationId,
      filter,
      paging,
      context,
    );
  });

  it('denies OrganizationMembers to a plain USER (coarse gate)', () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER']);

    expect(() =>
      map.Query.OrganizationMembers(null, { organizationId: new ObjectId().toString() }, context, {}),
    ).toThrow(/permissions/i);

    expect(organizationService.pagedOrganizationMembers).not.toHaveBeenCalled();
  });

  it('forwards inviteOrganizationMember arguments, defaulting businessUnitId to null', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ORGANIZATION_ADMIN']);
    const id = new ObjectId().toString();

    await map.Mutation.inviteOrganizationMember(
      null,
      { id, email: 'invitee@example.com', roles: ['USER'] },
      context,
      {},
    );

    expect(organizationService.inviteOrganizationMember).toHaveBeenCalledWith(
      id,
      'invitee@example.com',
      ['USER'],
      null,
      context,
    );
  });

  it('forwards an explicit businessUnitId when one is supplied', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ORGANIZATION_ADMIN']);
    const id = new ObjectId().toString();
    const businessUnitId = new ObjectId().toString();

    await map.Mutation.inviteOrganizationMember(
      null,
      { id, email: 'invitee@example.com', businessUnitId },
      context,
      {},
    );

    expect(organizationService.inviteOrganizationMember).toHaveBeenCalledWith(
      id,
      'invitee@example.com',
      undefined,
      businessUnitId,
      context,
    );
  });

  it('forwards deactivateOrganizationMember arguments', async () => {
    const map = harvest();
    const { context, organizationService } = makeContext(['USER', 'ORGANIZATION_ADMIN']);
    const id = new ObjectId().toString();
    const userId = new ObjectId().toString();

    await map.Mutation.deactivateOrganizationMember(null, { id, userId }, context, {});

    expect(organizationService.deactivateOrganizationMember).toHaveBeenCalledWith(
      id,
      userId,
      context,
    );
  });
});
