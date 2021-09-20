import { ObjectId } from 'mongodb';
import {
  BusinessUnit,
  Organization,
  User,
  Organigram,
} from '../../';
import logger from '../../../logging';
import { OrganizationNotFoundError, BusinessUnitExistsError, ValidationError, RecordNotFoundError } from '../../../exceptions';

const BusinessUnitResolver = {
  BusinessUnit: {
    id: (bu) => {
      return bu._id ? bu._id.toString() : null;
    },
    organization: (bu) => {
      if (bu.organization) {
        return Organization.findById(bu.organization).then();
      }
      return null;
    },
    owner: (bu) => {
      if (bu.owner) return User.findById(bu.owner).then();
      return null;
    },
    members: (bu) => {
      if (bu.members) {
        return bu.members.map(m => User.findById(m).then());
      }
      return [];
    },
  },
  Query: {
    businessUnitsForOrganization: async (parent, args) => {
      const { id, searchString } = args;
      const organization = await Organization.findById(id).then();
      if (organization) {
        const query = { organization: organization._id };
        if (searchString) {
          query.name = new RegExp(`${searchString}`, 'g');
        }
        return BusinessUnit.find(query).then();
      }
      throw new OrganizationNotFoundError('Could not locate the organization with the given id');
    },
    businessUnitWithId: async (parent, args) => {
      const { id } = args;
      return BusinessUnit.findById(id).then();
    },
  },
  Mutation: {
    createBusinessUnit: async (obj, args) => {
      const { input } = args;
      if (input.organization) {
        const organization = await Organization.findById(input.organization).then();
        if (!organization) throw new OrganizationNotFoundError('Could not locate the organization with id in the input');
        const buExists = await BusinessUnit.count({ organization: organization._id, name: input.name }).then() === 1;
        if (buExists === true) throw new BusinessUnitExistsError('Could not create the business with that name as it already exists for the organization');
        let businessUnit = new BusinessUnit(input);
        businessUnit = await businessUnit.save().then();
        return businessUnit;
      }

      throw new ValidationError('Could not validate the input');
    },
    updateBusinessUnit: async (parent, args) => {
      const { id, input } = args;
      // logger.info('Updating business unit', { id, input });
      if (id && input) {
        return BusinessUnit.findByIdAndUpdate(id, input).then();
      } return null;
    },
    addMemberToBussinessUnit: async (parent, { id, memberId }) => {
      const businessUnit = await businessUnit.findById(id).then();
      const user = await User.findById(memberId).then();
      if (businessUnit && user) {
        const organigram = await Organigram.findOne({ user: user.id, organization: businessUnit.organization.id }).then();
        if (organigram) {
          // set the user organigram entry to the correct business unit
          organigram.businessUnit = businessUnit.id;
          await organigram.save().then();
        }
      } else {
        throw new RecordNotFoundError('Could not find the member or business unit');
      }
    },
    removeMemberFromBusinessUnit: async (parent, { id, memberId }) => {
      const businessUnit = await businessUnit.findById(id).then();
      const user = await User.findById(memberId).then();
      if (businessUnit && user) {
        const organigram = await Organigram.findOne({ user: user.id, organization: businessUnit.organization.id, businessUnit: id }).then();
        if (organigram) {
          // set the user organigram entry to the correct business unit
          organigram.businessUnit = null;
          await organigram.save().then();
        }
      } else {
        throw new RecordNotFoundError('Could not find the member or business unit');
      }
    },
  },
};

export default BusinessUnitResolver;
