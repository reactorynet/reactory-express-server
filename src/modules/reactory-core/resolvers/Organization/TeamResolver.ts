import { ObjectId } from 'mongodb';
import { indexOf, remove } from 'lodash';
import { resolver, query, mutation, property } from '@reactory/server-core/models/graphql/decorators/resolver';
import {
  Team,
  Organization,
  User,
} from '@reactory/server-modules/reactory-core/models'

import { OrganizationNotFoundError, BusinessUnitExistsError, ValidationError, RecordNotFoundError } from '@reactory/server-core/exceptions';

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

  @query('teamsForOrganization')
  async teamsForOrganization(parent: any, args: any) {
    const { id, searchString } = args;
    const organization = await Organization.findById(id).then();
    if (organization) {
      const query: any = { organization: organization._id };
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

  @mutation('createTeam')
  async createTeam(obj: any, args: any, context: any) {
    const { input } = args;
    if (input.organization) {
      const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
      return await organizationService.createTeam(input.organization, input.name || input.title);
    }
    throw new ValidationError('Could not validate the input');
  }

  @mutation('updateTeam')
  async updateTeam(parent: any, args: any, context: any) {
    const { id, input } = args;
    if (id && input) {
      const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
      return await organizationService.updateTeam(id, input);
    }
    return null;
  }

  @mutation('addMemberToTeam')
  async addMemberToTeam(parent: any, args: { id: any, memberId: any }, context: any) {
    const { id, memberId } = args;
    const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
    return await organizationService.addMemberToTeam(id, memberId);
  }

  @mutation('removeMemberFromTeam')
  async removeMemberFromTeam(parent: any, args: { id: any, memberId: any }, context: any) {
    const { id, memberId } = args;
    const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
    return await organizationService.removeMemberFromTeam(id, memberId);
  }

  @mutation('deleteTeam')
  async deleteTeam(parent: any, args: { id: any }, context: any) {
    const { id } = args;
    const organizationService = context.getService('core.OrganizationService@1.0.0') as any;
    return await organizationService.deleteTeam(id);
  }
}

export default TeamResolver;
