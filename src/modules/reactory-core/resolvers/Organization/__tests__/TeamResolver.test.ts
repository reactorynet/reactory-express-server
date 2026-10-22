import { ObjectId } from 'mongodb';
import TeamResolver from '../TeamResolver';
import OrganizationResolver from '../Organization';
import { mergeGraphResolver } from '@reactory/server-core/utils';

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const Team: any = jest.fn();
  Team.find = jest.fn();
  Team.findById = jest.fn();

  const Organization: any = jest.fn();
  Organization.findById = jest.fn();

  const BusinessUnit: any = jest.fn();
  BusinessUnit.findById = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();

  return { Team, Organization, BusinessUnit, User };
});

const models = require('@reactory/server-modules/reactory-core/models');

/**
 * `MergeGraphResolvers` harvests the decorated methods from the class
 * prototype into a plain map, so the tests call the harvested functions the
 * same way the GraphQL layer does.
 */
const harvest = (): any => {
  const instance: any = Object.create((TeamResolver as any).prototype);
  return instance.resolver;
};

const makeContext = (roles: string[] = ['USER']) => {
  const service = {
    createTeam: jest.fn().mockResolvedValue({ _id: 'team-1', name: 'Platform' }),
    updateTeam: jest.fn().mockResolvedValue({ _id: 'team-1', name: 'Renamed' }),
    moveTeamToBusinessUnit: jest.fn().mockResolvedValue({ _id: 'team-1', businessUnit: 'bu-1' }),
    pagedTeams: jest.fn().mockResolvedValue({
      paging: { page: 1, pageSize: 25, total: 0, hasNext: false },
      teams: [],
    }),
  };

  const context: any = {
    user: { _id: new ObjectId(), email: 'admin@reactory.net' },
    partner: { _id: new ObjectId() },
    hasRole: jest.fn((role: string) => roles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => roles.length > 0),
    getService: jest.fn(() => service),
    log: jest.fn(),
  };

  return { context, service };
};

describe('TeamResolver (ORG-021)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges into the core resolver map without clobbering organization resolvers', () => {
    const merged: any = mergeGraphResolver([TeamResolver, OrganizationResolver]);

    expect(merged.Query.pagedTeams).toBeDefined();
    // Existing names must keep working.
    expect(merged.Query.teamsForOrganization).toBeDefined();
    expect(merged.Query.team).toBeDefined();
    expect(merged.Query.ReactoryTeam).toBeDefined();
    expect(merged.Query.ReactoryTeams).toBeDefined();
    expect(merged.Mutation.createTeam).toBeDefined();
    expect(merged.Mutation.updateTeam).toBeDefined();
    expect(merged.Mutation.moveTeamToBusinessUnit).toBeDefined();
    expect(merged.Mutation.addMemberToTeam).toBeDefined();
    expect(merged.Mutation.removeMemberFromTeam).toBeDefined();
    expect(merged.Mutation.deleteTeam).toBeDefined();
    expect(merged.Team.businessUnit).toBeDefined();
  });

  describe('pagedTeams', () => {
    it('forwards the organization, filter and paging to the service', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);
      const filter = { businessUnitId: 'bu-1', search: 'Platform' };
      const paging = { page: 2, pageSize: 10 };

      const result = await map.Query.pagedTeams(
        {},
        { organizationId: 'org-1', filter, paging },
        context,
      );

      expect(service.pagedTeams).toHaveBeenCalledWith('org-1', filter, paging);
      expect(result).toEqual({
        paging: { page: 1, pageSize: 25, total: 0, hasNext: false },
        teams: [],
      });
    });

    it('does not require a privileged role, only a signed-in user', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      await map.Query.pagedTeams({}, { organizationId: 'org-1' }, context);

      expect(service.pagedTeams).toHaveBeenCalled();
    });

    it('enforces the USER role gate', async () => {
      const map = harvest();
      const { context } = makeContext([]);

      await expect(
        Promise.resolve().then(() => map.Query.pagedTeams({}, { organizationId: 'org-1' }, context)),
      ).rejects.toThrow(/permission/i);
    });
  });

  describe('mutations delegate to the service', () => {
    it('forwards moveTeamToBusinessUnit with the caller context', async () => {
      const map = harvest();
      const { context, service } = makeContext(['ORGANIZATION_ADMIN']);

      const result = await map.Mutation.moveTeamToBusinessUnit(
        {},
        { id: 'team-1', businessUnitId: 'bu-1' },
        context,
      );

      expect(service.moveTeamToBusinessUnit).toHaveBeenCalledWith('team-1', 'bu-1', context);
      expect(result).toEqual({ _id: 'team-1', businessUnit: 'bu-1' });
    });

    it('enforces the team administration role gate on moveTeamToBusinessUnit', async () => {
      const map = harvest();
      const { context } = makeContext(['USER']);

      await expect(
        Promise.resolve().then(() =>
          map.Mutation.moveTeamToBusinessUnit({}, { id: 'team-1', businessUnitId: 'bu-1' }, context),
        ),
      ).rejects.toThrow(/permission/i);
    });

    it('forwards the business unit when creating a team', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);

      await map.Mutation.createTeam(
        {},
        { input: { organization: 'org-1', name: 'Platform', businessUnit: 'bu-1' } },
        context,
      );

      expect(service.createTeam).toHaveBeenCalledWith('org-1', 'Platform', context, 'bu-1');
    });

    it('forwards owner and businessUnit on update', async () => {
      const map = harvest();
      const { context, service } = makeContext(['USER']);
      const input = { businessUnit: 'bu-1', owner: 'user-1' };

      await map.Mutation.updateTeam({}, { id: 'team-1', input }, context);

      expect(service.updateTeam).toHaveBeenCalledWith('team-1', input, context);
    });
  });

  describe('Team.businessUnit property', () => {
    it('resolves the linked business unit', async () => {
      const map = harvest();
      const businessUnit = { _id: new ObjectId(), name: 'Engineering' };
      models.BusinessUnit.findById.mockResolvedValue(businessUnit);

      const result = await map.Team.businessUnit({ businessUnit: businessUnit._id });

      expect(models.BusinessUnit.findById).toHaveBeenCalledWith(businessUnit._id);
      expect(result).toBe(businessUnit);
    });

    it('returns null when the team is not assigned to a unit', async () => {
      const map = harvest();

      const result = await map.Team.businessUnit({ businessUnit: null });

      expect(result).toBeNull();
      expect(models.BusinessUnit.findById).not.toHaveBeenCalled();
    });
  });
});
