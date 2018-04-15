import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Organization as OrganizationLegacy } from '../../../database';
import { Organization } from '../../index';
import { migrateOrganization } from '../../../application/admin/Organization';

const organizationResolver = {
  Tennant: {

  },
  Organization: {
    id(obj) {
      return obj.id;
    },
  },
  Query: {
    allOrganizations(obj, args, context, info) {
      console.log('listing organizations', {
        obj, args, context, info,
      });

      if (args.legacy === true) {
        return OrganizationLegacy.listAll();
      }

      return Organization.find({}).then();
    },
  },
  Mutation: {
    createOrganization(obj, arg, context, info) {
      console.log('Create organization mutation called', {
        obj, arg, context, info,
      });
      const created = { id: ObjectId(), ...arg.input, createdAt: moment() };
      return created;
    },
    migrateOrganization(obj, arg, context, info) {
      console.log('Migrating organization data', {
        obj, arg, context, info,
      });
      const { id, options } = arg;
      return migrateOrganization(id, options);
    },
  },
};

module.exports = organizationResolver;
