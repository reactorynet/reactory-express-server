import { ObjectId } from 'mongodb';
import {
  BusinessUnit,
  Organization,
  User,
} from '../../';

import { OrganizationNotFoundError, BusinessUnitExistsError, ValidationError } from '../../../exceptions';

const BusinessUnitResolver = {
  BusinessUnit: {
    id: (bu) => {
      return bu._id ? bu._id.toString() : null;
    },
    organization: (bu) => {
      if (bu.organization) {
        return Organization.find({ _id: ObjectId(bu.organization) }).then((org => org));
      }
      return null;
    },
    owner: (bu) => {
      if (bu.owner) return User.find({ _id: ObjectId(bu.owner) }).then((owner => owner));
      return null;
    },
    members: (bu) => {
      if (bu.members) {
        return bu.members.map(m => User.findById(m));
      }
      return [];
    },
  },
  Query: {
    businessUnitsForOrganization: async (parent, args) => {
      const { id } = args;
      const organization = await Organization.findById(id).then();
      if (organization) {
        return BusinessUnit.find({ organization: organization._id }).then();
      }
      throw new OrganizationNotFoundError('Could not locate the organization with the given id');
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
      if (id && input) {
        return BusinessUnit.findByIdAndUpdate(id, input).then();
      }

      return null;
    },
  },
};

export default BusinessUnitResolver;
