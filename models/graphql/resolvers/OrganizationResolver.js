import { ObjectId } from 'mongodb';
import moment from 'moment';
import legacy from '../../../database';
import { Organization } from '../../index';
import { migrateOrganization, migrateCoreData } from '../../../application/admin/Organization';
import * as UserService from '../../../application/admin/User';

const organizationResolver = {
  Tennant: {

  },
  Organization: {
    id(obj) {
      return obj.id;
    },
    createdAt(obj) {
      return obj.createdAt || moment().unix();
    },
    updatedAt(obj) {
      return obj.updatedAt || moment().unix();
    },
  },
  Query: {
    allOrganizations(obj, args, context, info) {
      console.log('listing organizations', {
        obj, args, context, info
      });

      if (args.legacy === true) {
        return legacy.Organization.listAll();
      }

      return Organization.find({}).then();
    },
    organizationWithId(obj, args, context, info) {
      console.log('listing organizationWithId', {
        obj, args, context, info,
      });
      return Organization.findOne({ _id: args.id }).then();
    },
    usersForOrganizationWithId(obj, args, context, info) {
      return UserService.listAllForOrganization(args.id);
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
        obj, arg, context, info, partner: global.partner,
      });
      const { id, options } = arg;
      if (!options.clientKey) options.clientKey = global.partner.key;
      return migrateOrganization(id, options);
    },
    updateOrganization(obj, arg, context, info) {
      Organization.findOne({ _id: ObjectId(arg.id) }).then((organization) => {
        const { code, name, logo } = arg.input;
        organization.code = code || organization.code;
        organization.name = name || organization.name;
        organization.logo = logo || organization.logo;
        organization.createdAt = organization.createdAt || moment().valueOf();
        organization.updatedAt = moment().valueOf();
        return organization.save().then((updated) => { return updated; });
      }).catch((err) => {
        console.error('update failed', err)
        return err;
      });
    },
    migrateCore(obj, arg, context, info) {
      const { options } = arg;
      if (!options.clientKey) options.clientKey = global.partner.key;
      return migrateCoreData(options);
    }
  },
};

module.exports = organizationResolver;
