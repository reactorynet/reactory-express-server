import { ObjectId } from 'mongodb';
import co from 'co';
import moment from 'moment';

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import pngToJpeg from 'png-to-jpeg';
import dotenv from 'dotenv';
import legacy from '../../../database';
import { Organization } from '../../index';
import { migrateOrganization, migrateCoreData, updateOrganizationLogo } from '../../../application/admin/Organization';
import * as UserService from '../../../application/admin/User';

dotenv.config();

const {
  APP_DATA_ROOT,
} = process.env;


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
        obj, args, context, info,
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
    usersForOrganizationWithId(obj, { id, searchString }, context, info) {
      return UserService.listAllForOrganization(id, searchString);
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
    updateOrganization(obj, props, context, info) {
      return co.wrap(function* updateOrganizationGenerator(variables) {
        const inputData = variables.input;
        let found = yield Organization.findOne({ _id: ObjectId(variables.id) }).then();
        if (found && found._id) {
          found.code = inputData.code;
          found.name = inputData.name;
          found.logo = updateOrganizationLogo(found, inputData.logo);
          found.createdAt = found.createdAt || moment().valueOf();
          found.updatedAt = moment().valueOf();
          found = yield found.save().then();
          return found;
        }
        throw new ApiError('Organization not found');
      })(props);
    },
    migrateCore(obj, arg, context, info) {
      const { options } = arg;
      if (!options.clientKey) options.clientKey = global.partner.key;
      return migrateCoreData(options);
    },
  },
};

module.exports = organizationResolver;
