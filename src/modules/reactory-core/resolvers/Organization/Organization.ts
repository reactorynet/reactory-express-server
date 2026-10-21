
import Reactory from '@reactorynet/reactory-core';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { roles } from '@reactory/server-core/authentication/decorators';
import ApiError from '@reactory/server-core/exceptions';
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

/**
 * The org-scoped administration surface added by ORG-005.
 *
 * The published `IReactoryOrganizationService` interface ships in the packaged
 * `reactory-core` types and predates these operations, so the resolver declares
 * the additional signatures locally - the same approach ORG-004 took for the
 * theme methods. The methods themselves are implemented on `OrganizationService`.
 */
export interface IOrganizationAdministrationService
  extends Reactory.Service.IReactoryOrganizationService {
  create(
    name: string,
    input?: any,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  updateOrganization(
    id: string,
    input: any,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  archiveOrganization(
    id: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  restoreOrganization(
    id: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  getSettings(id: string): Promise<Reactory.Models.IOrganizationSetting[]>;
  setSetting(
    id: string,
    name: string,
    data: any,
    componentFqn?: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  removeSetting(
    id: string,
    name: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  getStatistics(
    id: string,
  ): Promise<{ members: number; businessUnits: number; teams: number }>;
  addMember(
    id: string,
    userId: string,
    roles?: string[],
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  removeMember(
    id: string,
    userId: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  setMemberRoles(
    id: string,
    userId: string,
    roles: string[],
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
  /**
   * Stored on the service as `uploadOrganizationImage(id, file, imageType,
   * executionContext)`. The published interface does not declare the execution
   * context argument, so it is redeclared here to forward the caller (ORG-005).
   */
  uploadOrganizationImage(
    id: string,
    file: Reactory.Service.IFile,
    imageType: Reactory.Service.OrganizationImageType,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Models.IOrganizationDocument>;
}

const ORGANIZATION_SERVICE_ID = 'core.OrganizationService@1.0.0';

/**
 * Cheap first gate for organization administration. The service performs the
 * real check (`assertOrgAdmin`) against the target organization id; these
 * roles only prove the caller holds *a* privileged role somewhere.
 */
const ORGANIZATION_ADMIN_ROLES = ['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'];

/** Creation has no target organization yet: platform admins or SYSTEM only. */
const ORGANIZATION_CREATE_ROLES = ['ADMIN', 'SYSTEM'];

/**
 * The organization image slots `uploadOrganizationImage` can write to. The
 * service assumes a valid value and destructures its upload context from it,
 * so the transport validates it rather than trusting the client.
 */
const ORGANIZATION_IMAGE_TYPES = ['logo', 'avatar'];

const organizationService = (
  context: Reactory.Server.IReactoryContext,
): IOrganizationAdministrationService =>
  context.getService(ORGANIZATION_SERVICE_ID) as unknown as IOrganizationAdministrationService;

/**
 * Cache-busting token appended to organization image URLs.
 *
 * `YYYMMDDhh` is not a valid moment format (three year tokens, a 12-hour
 * clock); `YYYYMMDDHH` renders an ISO-like, lexicographically sortable stamp
 * that changes whenever a new image is stored.
 */
const organizationImageCacheToken = (): string => moment().format('YYYYMMDDHH');

/**
 * Resolves the CDN URL for an organization image alias. Shared by `avatarURL`
 * and `logoURL` so both use the same path shape and cache-busting token.
 */
const organizationImageUrl = (organization: any, alias: string): string =>
  safeCDNUrl(`organization/${organization._id}/${alias}?t=${organizationImageCacheToken()}`);

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
      return organizationImageUrl(organization, organization.avatar);
    }
    if (organization && organization.logo) {
      return organizationImageUrl(organization, organization.logo);
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
      return organizationImageUrl(organization, organization.logo);
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
    const service = organizationService(context);
    return service.getOrganizationsForLoggedInUser(params.search, 'name', 'asc', context);
  }

  @query('CorePagedOrganizations')
  @roles(['USER'])
  async CorePagedOrganizations(obj: any, params: CorePagedOrganizationParams, context: Reactory.Server.IReactoryContext): Promise<{ paging: Reactory.Models.IPagingResult; organizations: Reactory.Models.IOrganization[] }> {
    const service = organizationService(context);
    return service.getPagedOrganizationsForLoggedInUser(params.search, 'name', 'asc', params.paging, context);
  }

  /**
   * Member, business-unit and team counts for the organization dashboard.
   * Read-only and available to any authenticated user, matching the other
   * organization read queries.
   */
  @query('OrganizationStatistics')
  @roles(['USER'])
  async OrganizationStatistics(
    obj: any,
    params: { id: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationService(context).getStatistics(params.id);
  }

  // ---- Mutations ----

  /**
   * ORG-005: creation is the one case with no organization to scope against.
   * Only a platform ADMIN or SYSTEM may create; initial fields are applied in
   * the same call so a SYSTEM caller can complete the create.
   */
  @mutation('createOrganization')
  @roles(ORGANIZATION_CREATE_ROLES)
  async createOrganization(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { input } = args;
    return organizationService(context).create(input.name, input, context);
  }

  @mutation('updateOrganization')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async updateOrganization(parent: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { id, input } = args;
    return organizationService(context).updateOrganization(id, input, context);
  }

  @mutation('archiveOrganization')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async archiveOrganization(obj: any, params: { id: string }, context: Reactory.Server.IReactoryContext) {
    return organizationService(context).archiveOrganization(params.id, context);
  }

  @mutation('restoreOrganization')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async restoreOrganization(obj: any, params: { id: string }, context: Reactory.Server.IReactoryContext) {
    return organizationService(context).restoreOrganization(params.id, context);
  }

  @mutation('OrganizationSetSetting')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async OrganizationSetSetting(
    obj: any,
    params: { id: string; name: string; data?: any; componentFqn?: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationService(context).setSetting(
      params.id,
      params.name,
      params.data,
      params.componentFqn,
      context,
    );
  }

  @mutation('OrganizationRemoveSetting')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async OrganizationRemoveSetting(
    obj: any,
    params: { id: string; name: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationService(context).removeSetting(params.id, params.name, context);
  }

  @mutation('addOrganizationMember')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async addOrganizationMember(
    obj: any,
    params: { id: string; userId: string; roles?: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationService(context).addMember(params.id, params.userId, params.roles, context);
  }

  @mutation('removeOrganizationMember')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async removeOrganizationMember(
    obj: any,
    params: { id: string; userId: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationService(context).removeMember(params.id, params.userId, context);
  }

  @mutation('setOrganizationMemberRoles')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async setOrganizationMemberRoles(
    obj: any,
    params: { id: string; userId: string; roles: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    return organizationService(context).setMemberRoles(params.id, params.userId, params.roles, context);
  }

  /**
   * ORG-013a: thin transport for the already-implemented
   * `OrganizationService.uploadOrganizationImage`.
   *
   * The service uploads through `ReactoryFileService`, assigns the returned
   * alias to `organization.logo` / `organization.avatar`, awaits `save()` and
   * returns the document, so nothing beyond validation belongs here. The
   * execution context is forwarded explicitly so the service's org-scoped
   * `assertOrgAdmin` evaluates the caller rather than the service singleton's
   * construction-time context.
   */
  @mutation('OrganizationUploadImage')
  @roles(ORGANIZATION_ADMIN_ROLES)
  async OrganizationUploadImage(
    obj: any,
    params: { id: string; imageType: string; file: Reactory.Service.IFile },
    context: Reactory.Server.IReactoryContext,
  ) {
    const { id, imageType, file } = params;

    if (ORGANIZATION_IMAGE_TYPES.indexOf(imageType) < 0) {
      throw new ApiError(
        `Invalid imageType "${imageType}" for organization image upload; expected "logo" or "avatar".`,
        { imageType, allowed: ORGANIZATION_IMAGE_TYPES },
      );
    }

    return organizationService(context).uploadOrganizationImage(
      id,
      file,
      imageType as Reactory.Service.OrganizationImageType,
      context,
    );
  }
}

export default OrganizationResolver;
