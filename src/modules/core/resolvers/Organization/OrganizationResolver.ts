import { ObjectId } from 'mongodb';
import moment from 'moment';

import { Organization, BusinessUnit } from '@reactory/server-core/models';
import { updateOrganizationLogo } from '../../../../application/admin/Organization';
import * as UserService from '../../../../application/admin/User';
import ApiError, { OrganizationNotFoundError } from '@reactory/server-core/exceptions';;

import Reactory from '@reactory/reactory-core';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'


const {
  APP_DATA_ROOT,
  CDN_ROOT
} = process.env;


const organizationResolver = {  
  Organization: {
    id({ _id }) {

      return _id ? `${_id.toString()}` : 'organization-no-id';
    },
    avatar(organization) {
      if (organization && organization.avatar) return organization.avatar;

      return null;
    },
    avatarURL(organization: any, params: any, context: Reactory.Server.IReactoryContext) { //eslint-disable-line
      if (organization && organization.avatar) {
        return `${CDN_ROOT}organization/${organization._id}/${organization.avatar}?t=${moment().format('YYYMMDDhh')}`;
      }

      if (organization && organization.logo) {
        return `${CDN_ROOT}organization/${organization._id}/${organization.logo}?t=${moment().format('YYYMMDDhh')}`;
      }

      return null;
    },
    tradingName(organization) {
      if (!organization) return 'Null Organization';

      return organization.tradingName || organization.name;
    },
    logoURL: (organization) => {
      if (organization && organization.logo) {
        return `${CDN_ROOT}organization/${organization._id}/${organization.logo}?t=${moment().format('YYYMMDDhh')}`;
      }

      return null;
    },
    businessUnits: async (organization: Reactory.IOrganizationDocument, args: any, context: Reactory.Server.IReactoryContext) => {
      if (organization.businessUnits && organization.businessUnits.length > 0) return organization.businessUnits;

      return BusinessUnit.find({ organization: organization._id }).then();
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
      if (ObjectId.isValid(args.id) === true) return Organization.findById(args.id).then();
      else return null;
    },
    CoreOrganization(obj: any, params: { id: string }, context: Reactory.Server.IReactoryContext, info: any) {

      if (ObjectId.isValid(params.id) === true) return Organization.findById(params.id).then();
      else return null;
    },
    CoreUsersForOrganization(obj, { id, searchString, excludeSelf = false, showDeleted = false, paging = null }, context, info) {
      return UserService.listAllForOrganization(id, searchString, excludeSelf, showDeleted, paging || { page: 1, pageSize: 25 }).then();
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
    createOrganization: async (obj, args, context: Reactory.Server.IReactoryContext, info) => {
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
          context.log('Could not save the organization logo', logoErr, 'error');
        }
      }

      return organization;
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
          context.log('Could not save the organization logo', logoErr, 'error');
        }
        organization.createdAt = organization.createdAt || moment().valueOf();
        organization.updatedAt = moment().valueOf();
        await organization.save().then();
        return organization;
      }

      throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found `);
    },   
  },
};

export default organizationResolver;