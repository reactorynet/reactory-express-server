import { ObjectId } from 'mongodb';
import co from 'co';
import moment from 'moment';

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import pngToJpeg from 'png-to-jpeg';
import * as dotenv from 'dotenv';
import legacy from '../../../database';
import { Organization, BusinessUnit } from '../../index';
import { migrateOrganization, migrateCoreData, updateOrganizationLogo } from '../../../application/admin/Organization';
import * as UserService from '../../../application/admin/User';
import ApiError, { OrganizationNotFoundError } from '../../../exceptions';
import logger from '../../../logging';

dotenv.config();

const {
  APP_DATA_ROOT,
  CDN_ROOT
} = process.env;


const organizationResolver = {
  Tennant: {

  },
  Organization: {
    id({ _id }) {
      
      return _id ? `${_id.toString()}` : 'organization-no-id';
    },
    avatar() {
      return null;
    },
    tradingName(organization) {
      if(!organization) return 'Null Organization';

      return organization.tradingName || organization.name;
    },
    logoURL: (organization) => {
      
      if(organization && organization.logo) {
        return `${CDN_ROOT}organization/${organization.id}/${organization.logo}?t=${moment().format('YYYMMDDhh')}`
      }
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
      return Organization.find({}).sort('name').then();
    },
    organizationWithId(obj, args, context, info) {
      return Organization.findOne({ _id: args.id }).then();
    },
    CoreUsersForOrganization(obj, { id, searchString, excludeSelf = false, showDeleted = false, paging = null }, context, info) {
      logger.debug(`Users for Organizations Called`, {id, searchString, excludeSelf, showDeleted, paging});
      return UserService.listAllForOrganization(id, searchString, excludeSelf, showDeleted, paging).then();
    },
    organizationsForUser: async (obj, { id }) => {
      const user = await User.findById(id);
      const organizations = [];
      if (user.memberships) {
        for (let mi = 0; mi <= user.memberships.length; mi += 1) {
          const membership = user.memberships[mi];
          if (membership.organization) {
            organizations.push(await Organization.findById(organization));
          }
        }
      }
      return organizations;
    },
  },
  Mutation: {
    createOrganization: async (obj, args, context, info) => {
      const { input } = args;
      const inputData = { ...input };
      const exists = await Organization.count({ code: inputData.code }).then() === 0;

      if (exists === false) throw new ApiError(`Organization with the code ${input.code} is already registered `);

      delete inputData.logo;
      const organization = new Organization({
        ...inputData,
        createdAt: new Date().valueOf(),
        updatedAt: new Date().valueOf(),
      });

      await organization.save().then();

      if (input.logo !== null && input.logo !== undefined) {
        try {
          organization.logo = updateOrganizationLogo(organization, input.logo);
          await organization.save().then();
        } catch (logoErr) {
          logger.error('Could not save the organization logo', logoErr);
        }
      }

      return organization;
    },
    migrateOrganization(obj, { id, options }) {
      if (!options.clientKey) options.clientKey = global.partner.key;
      logger.debug(`Mutation migrationOrganization ${id}`, options);
      return migrateOrganization(id, options);
    },
    updateOrganization: async (parent, args) => {
      const { input, id } = args;
      const _id = ObjectId(id);
      const inputData = { ...input };
      const exists = await Organization.count({ _id }).then() === 1;

      if (exists === false) throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`);
      const organization = await Organization.findOne({ _id }).then();

      if (organization && organization._id) {
        organization.code = inputData.code;
        organization.name = inputData.name;
        try {
          organization.logo = updateOrganizationLogo(organization, inputData.logo);
        } catch (logoError) {
          logger.warn('Could not update the organization logo');
        }
        organization.createdAt = organization.createdAt || moment().valueOf();
        organization.updatedAt = moment().valueOf();
        await organization.save().then();
        return organization;
      }

      throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found `);
    },
    migrateCore(obj, arg, context, info) {
      const { options } = arg;
      if (!options.clientKey) options.clientKey = global.partner.key;
      logger.info('migrateCore mutation called', options);
      return migrateCoreData(options);
    },
  },
};

module.exports = organizationResolver;
