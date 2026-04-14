
import Reactory from '@reactorynet/reactory-core';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';
import {
  Organization,
  BusinessUnit,
  User,
} from '@reactory/server-modules/reactory-core/models';

interface CoreOrganizationParams {
  search?: string;
}

interface CorePagedOrganizationParams extends CoreOrganizationParams {
  paging: Reactory.Models.IPagingRequest;
}

//@ts-ignore - this has to be called without the () as this throws an error in the decorator
@resolver
class OrganizationResolver {

  resolver: Reactory.Graph.IResolverStruct;

  // ---- Organization type property resolvers ----

  @property('Organization', 'id')
  id(organization: any) {
    return organization._id ? `${organization._id.toString()}` : 'organization-no-id';
  }

  @property('Organization', 'avatar')
  avatar(organization: any) {
    if (organization && organization.avatar) return organization.avatar;
    return null;
  }

  @property('Organization', 'avatarURL')
  avatarURL(organization: any, params: any, context: Reactory.Server.IReactoryContext) {
    if (organization && organization.avatar) {
      return safeCDNUrl(`organization/${organization._id}/${organization.avatar}?t=${moment().format('YYYMMDDhh')}`);
    }
    if (organization && organization.logo) {
      return safeCDNUrl(`organization/${organization._id}/${organization.logo}?t=${moment().format('YYYMMDDhh')}`);
    }
    return null;
  }

  @property('Organization', 'tradingName')
  tradingName(organization: any) {
    if (!organization) return 'Null Organization';
    return organization.tradingName || organization.name;
  }

  @property('Organization', 'logoURL')
  logoURL(organization: any) {
    if (organization && organization.logo) {
      return safeCDNUrl(`organization/${organization._id}/${organization.logo}?t=${moment().format('YYYMMDDhh')}`);
    }
    return null;
  }

  @property('Organization', 'businessUnits')
  async businessUnits(organization: Reactory.IOrganizationDocument, args: any, context: Reactory.Server.IReactoryContext) {
    if (organization.businessUnits && organization.businessUnits.length > 0) return organization.businessUnits;
    return BusinessUnit.find({ organization: organization._id }).then();
  }

  @property('Organization', 'createdAt')
  createdAt(obj: any) {
    return obj.createdAt || moment().unix();
  }

  @property('Organization', 'updatedAt')
  updatedAt(obj: any) {
    return obj.updatedAt || moment().unix();
  }

  // ---- Queries ----

  @query('allOrganizations')
  async allOrganizations(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    return Organization.find({}).sort('name').then();
  }

  @query('organizationWithId')
  async organizationWithId(obj: any, args: any) {
    if (ObjectId.isValid(args.id)) return Organization.findById(args.id).then();
    return null;
  }

  @query('CoreOrganization')
  async CoreOrganization(obj: any, params: { id: string }, context: Reactory.Server.IReactoryContext) {
    if (ObjectId.isValid(params.id)) return Organization.findById(params.id).then();
    return null;
  }

  @query('CoreUsersForOrganization')
  async CoreUsersForOrganization(
    obj: any,
    { id, searchString, excludeSelf = false, showDeleted = false, paging = null }: any,
    context: Reactory.Server.IReactoryContext,
  ) {
    const userService = context.getService('core.UserService@1.0.0') as any;
    return userService.listAllForOrganization(
      id, searchString, excludeSelf, showDeleted, paging || { page: 1, pageSize: 25 },
    );
  }

  @query('organizationsForUser')
  async organizationsForUser(obj: any, { id }: any) {
    const user = await User.findById(id);
    const organizations: any[] = [];
    if (user && user.memberships) {
      for (const membership of (user.memberships as any[])) {
        if (membership.organization) {
          const org = await Organization.findById(membership.organization);
          if (org) organizations.push(org);
        }
      }
    }
    return organizations;
  }

  @query('CoreOrganizations')
  @roles(['USER'])
  async CoreOrganizations(obj: any, params: CoreOrganizationParams, context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.IOrganization[]> {
    const organizationService = context.getService('core.OrganizationService@1.0.0') as Reactory.Service.IReactoryOrganizationService;
    return organizationService.getOrganizationsForLoggedInUser(params.search, 'name', 'asc');
  }

  @query('CorePagedOrganizations')
  @roles(['USER'])
  async CorePagedOrganizations(obj: any, params: CorePagedOrganizationParams, context: Reactory.Server.IReactoryContext): Promise<{ paging: Reactory.Models.IPagingResult; organizations: Reactory.Models.IOrganization[] }> {
    const organizationService = context.getService('core.OrganizationService@1.0.0') as Reactory.Service.IReactoryOrganizationService;
    return organizationService.getPagedOrganizationsForLoggedInUser(params.search, 'name', 'asc', params.paging);
  }

  // ---- Mutations ----

  @mutation('createOrganization')
  async createOrganization(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { input } = args;
    const organizationService = context.getService('core.OrganizationService@1.0.0') as Reactory.Service.IReactoryOrganizationService;
    let organization = await organizationService.create(input.name);
    if (input.code || input.logo) {
      organization = await organizationService.setOrganization(`${organization._id}`, {
        code: input.code,
        logo: input.logo,
      });
    }
    return organization;
  }

  @mutation('updateOrganization')
  async updateOrganization(parent: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { id, input } = args;
    const organizationService = context.getService('core.OrganizationService@1.0.0') as Reactory.Service.IReactoryOrganizationService;
    return organizationService.setOrganization(id, input);
  }
}

export default OrganizationResolver;