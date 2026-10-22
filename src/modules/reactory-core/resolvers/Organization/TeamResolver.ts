import Reactory from '@reactorynet/reactory-core';
import { ObjectId } from 'mongodb';
import { indexOf, remove } from 'lodash';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation, property } from '@reactory/server-core/models/graphql/decorators/resolver';
import {
  Team,
  BusinessUnit,
  Organization,
  User,
} from '@reactory/server-modules/reactory-core/models'

import {
  OrganizationNotFoundError,
  BusinessUnitExistsError,
  ValidationError,
  RecordNotFoundError,
} from '@reactory/server-core/exceptions';

/**
 * The team surface added by ORG-021.
 *
 * Declared locally because the published `IReactoryOrganizationService`
 * interface ships in the packaged `reactory-core` types and predates these
 * operations - the same approach ORG-020 took for business units and ORG-004
 * for themes. The execution context is forwarded so the service's org-scoped
 * `assertOrgAdmin` check evaluates the caller, not whatever context the
 * singleton happened to be constructed with.
 */
export interface ITeamService {
  createTeam(
    organizationId: string,
    name: string,
    executionContext?: Reactory.Server.IReactoryContext,
    businessUnitId?: string | null,
  ): Promise<any>;
  updateTeam(
    id: string,
    updates: any,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any>;
  moveTeamToBusinessUnit(
    id: string,
    businessUnitId: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any>;
  pagedTeams(
    organizationId: string,
    filter?: any,
    paging?: Reactory.Models.IPagingRequest,
  ): Promise<{ paging: Reactory.Models.IPagingResult; teams: any[] }>;
}

const ORGANIZATION_SERVICE_ID = 'core.OrganizationService@1.0.0';

/**
 * Cheap first gate for team administration. The service performs the real check
 * (`assertOrgAdmin` against the team's parent organization); these roles only
 * prove the caller holds *a* privileged role somewhere.
 */
const TEAM_ADMIN_ROLES = ['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'];

const teamService = (context: Reactory.Server.IReactoryContext): ITeamService =>
  context.getService(ORGANIZATION_SERVICE_ID) as unknown as ITeamService;

//@ts-ignore - this has to be called without the () as this throws an error in the decorator
@resolver
class TeamResolver {

  @property('Team', 'id')
  id(team: any) {
    return team._id ? team._id.toString() : null;
  }

  @property('Team', 'title')
  title(team: any) {
    if(team.name && team.name.length > 0) return team.name;
    return team.title;
  }

  @property('Team', 'name')
  name(team: any) {
    if (team.name && team.name.length > 0) return team.name;
    return team.title;
  }

  @property('Team', 'organization')
  async organization(team: any) {
    if (team.organization) {
      return Organization.findById(team.organization).then();
    }
    return null;
  }

  /**
   * Resolves the team's business unit link (ORG-021). `null` when the team is
   * not assigned to a unit, which is a valid state.
   */
  @property('Team', 'businessUnit')
  async businessUnit(team: any) {
    if (team.businessUnit) {
      return BusinessUnit.findById(team.businessUnit).then();
    }
    return null;
  }

  @property('Team', 'owner')
  async owner(team: any) {
    if (team.owner) return User.findById(team.owner).then();
    return null;
  }

  @property('Team', 'members')
  async members(team: any) {
    if (team.members) {
      return Promise.all(team.members.map((m: any) => User.findById(m).then()));
    }
    return [];
  }

  @property('Team', 'createdAt')
  createdAt(team: any) {
    return team.createdAt || Date.now();
  }

  @property('Team', 'updatedAt')
  updatedAt(team: any) {
    return team.updatedAt || team.createdAt || Date.now();
  }

  @query('teamsForOrganization')
  async teamsForOrganization(parent: any, args: any) {
    const { id, searchString } = args;
    const organization = await Organization.findById(id).then();
    if (organization) {
      const query: any = { organization: organization._id, deleted: { $ne: true } };
      if (searchString) {
        query.name = new RegExp(`${searchString}`, 'g');
      }
      return Team.find(query).then();
    }
    throw new OrganizationNotFoundError('Could not locate the organization with the given id', 'Organization');
  }

  @query('team')
  async team(parent: any, args: any) {
    const { id } = args;
    return Team.findById(id).then();
  }

  @query('ReactoryTeam')
  async ReactoryTeam(parent: any, args: any) {
    const { id } = args;
    return Team.findById(id).then();
  }

  /**
   * Legacy paged query. Kept for existing consumers; it retains its
   * cross-organization listing behaviour when `filter.organization` is omitted.
   */
  @query('ReactoryTeams')
  async ReactoryTeams(parent: any, args: any, context: any) {
    try {
      const { paging, filter } = args;
      const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
      
      const result = await organizationService.getPagedTeamsForOrganization(
        filter?.organization,
        filter,
        paging
      );

      return {
        __typename: 'ReactoryTeamPagedResults',
        teams: result.teams,
        paging: result.paging,
      };
    } catch (err: any) {
      return {
        __typename: 'ReactoryTeamsQueryFailed',
        message: err.message || 'Failed to fetch teams',
        code: 'ERR_TEAMS_QUERY',
      };
    }
  }

  /**
   * Paged, filterable teams for one organization (ORG-021). Mirrors
   * `pagedBusinessUnits`: same `{ paging, teams }` envelope, requires a real
   * organization id, and supports `filter.businessUnitId`.
   */
  @query('pagedTeams')
  @roles(['USER'])
  async pagedTeams(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { organizationId, filter, paging } = args;
    return teamService(context).pagedTeams(organizationId, filter, paging);
  }

  @mutation('createTeam')
  async createTeam(obj: any, args: any, context: any) {
    const { input } = args;
    if (input.organization) {
      const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
      return await organizationService.createTeam(
        input.organization,
        input.name || input.title,
        context,
        input.businessUnit
      );
    }
    throw new ValidationError('Could not validate the input');
  }

  @mutation('updateTeam')
  async updateTeam(parent: any, args: any, context: any) {
    const { id, input } = args;
    if (id && input) {
      const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
      return await organizationService.updateTeam(id, input, context);
    }
    return null;
  }

  /**
   * Moves a team into a business unit. Delegates to
   * `OrganizationService.moveTeamToBusinessUnit`, which re-validates both sides
   * and enforces the org-scoped authorization boundary.
   */
  @mutation('moveTeamToBusinessUnit')
  @roles(TEAM_ADMIN_ROLES)
  async moveTeamToBusinessUnit(parent: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { id, businessUnitId } = args;
    return teamService(context).moveTeamToBusinessUnit(id, businessUnitId, context);
  }

  @mutation('addMemberToTeam')
  async addMemberToTeam(parent: any, args: { id: any, memberId: any }, context: any) {
    const { id, memberId } = args;
    const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
    return await organizationService.addMemberToTeam(id, memberId, context);
  }

  @mutation('removeMemberFromTeam')
  async removeMemberFromTeam(parent: any, args: { id: any, memberId: any }, context: any) {
    const { id, memberId } = args;
    const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
    return await organizationService.removeMemberFromTeam(id, memberId, context);
  }

  @mutation('deleteTeam')
  async deleteTeam(parent: any, args: { id: any }, context: any) {
    const { id } = args;
    const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
    return await organizationService.deleteTeam(id, context);
  }
}

export default TeamResolver;
