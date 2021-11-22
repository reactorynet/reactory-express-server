import { ObjectId } from 'mongodb';
import { indexOf, remove } from 'lodash';
import {
  Project,
  Board,
  Organization,
  User,
} from '@reactory/server-core/models';

import { OrganizationNotFoundError, BusinessUnitExistsError, ValidationError, RecordNotFoundError } from '@reactory/server-core/exceptions';

const TeamResolver = {
  Team: {
    id: (team) => {
      return team._id ? team._id.toString() : null;
    },
    organization: (team) => {
      if (team.organization) {
        return Organization.findById(team.organization).then();
      }
      return null;
    },
    owner: (team) => {
      if (team.owner) return User.findById(team.owner).then();
      return null;
    },
    members: (team) => {
      if (team.members) {
        return team.members.map(m => User.findById(m).then());
      }
      return [];
    },
  },
  Query: {
    teamsForOrganization: async (parent, args) => {
      const { id, searchString } = args;
      const organization = await Organization.findById(id).then();
      if (organization) {
        const query = { organization: organization._id };
        if (searchString) {
          query.name = new RegExp(`${searchString}`, 'g');
        }
        return Team.find(query).then();
      }
      throw new OrganizationNotFoundError('Could not locate the organization with the given id');
    },
    team: async (parent, args) => {
      const { id } = args;
      return Team.findById(id).then();
    },
  },
  Mutation: {
    createTeam: async (obj, args) => {
      const { input } = args;
      if (input.organization) {
        const organization = await Organization.findById(input.organization).then();
        if (!organization) throw new OrganizationNotFoundError('Could not locate the organization with id in the input');
        const buExists = await Team.count({ organization: organization._id, name: input.name }).then() === 1;
        if (buExists === true) throw new BusinessUnitExistsError('Could not create the business with that name as it already exists for the organization');
        let team = new Team(input);
        team = await Team.save().then();
        return team;
      }

      throw new ValidationError('Could not validate the input');
    },
    updateTeam: async (parent, args) => {
      const { id, input } = args;
      if (id && input) {
        return Team.findByIdAndUpdate(id, input).then();
      }

      return null;
    },
    addMemberToTeam: async (parent, { id, memberId }) => {
      const team = await Team.findById(id).then();
      const user = await User.findById(memberId).then();
      if (team && user) {
        if (indexOf(team.members, user._id) === -1) {
          team.members = team.members.push(user);
          return team.save().then();
        }
      } else {
        throw new RecordNotFoundError('Could not find the member or business unit');
      }
    },
    removeMemberFromTeam: async (parent, { id, memberId }) => {
      const team = await Team.findById(id).then();
      const user = await User.findById(memberId).then();
      if (team && user) {
        if (indexOf(team.members, user._id) >= 0) {
          team.members = remove(team.members, user._id);
          return team.save().then();
        }
      } else {
        throw new RecordNotFoundError('Could not find the member or business unit');
      }
    },
  },
};

export default TeamResolver;
