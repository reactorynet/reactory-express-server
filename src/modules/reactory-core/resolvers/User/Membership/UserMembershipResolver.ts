import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import ApiError from '@reactory/server-core/exceptions';
import { ObjectId } from 'mongodb';


const UserMembership: string = "UserMembership"


@resolver
class UserMembershipResolver {

  resolver: any
  
  @property(UserMembership, "id")
  id(obj: Reactory.Models.TMembership): string | null {
    if ((obj as Reactory.Models.IMembershipDocument)._id) return (obj as Reactory.Models.IMembershipDocument)._id.toString() 
    if(obj.id) return obj.id;
    return null;
  }

  @property(UserMembership, "client")
  async client(obj: Reactory.Models.TMembership, 
    params: any,
    context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.TReactoryClient> {
    if(obj.clientId === null || obj.clientId === undefined) throw new ApiError('Membership object cannot have null error')
    const systemService: Reactory.Service.IReactorySystemService = context.getService("core.SystemService@1.0.0");
    return systemService.getReactoryClient(obj.clientId);
  }

  @property(UserMembership, "businessUnit")
  async businessUnit(obj: Reactory.Models.TMembership,
    params: any,
    context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.TBusinessUnit> {
    if(obj.organizationId === null || obj.organizationId === undefined) return null;
    if(obj.businessUnitId === null || obj.businessUnitId === undefined) return null;

    const organizationService: Reactory.Service.IReactoryOrganizationService = context.getService('core.OrganizationService@1.0.0') as Reactory.Service.IReactoryOrganizationService;
    return organizationService.findBusinessUnit(obj.organizationId, obj.businessUnitId);
  }

  @property(UserMembership, "organization")
  async organization(obj: Reactory.Models.TMembership,
    params: any,
    context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.IOrganizationDocument> {
    if (obj.organizationId === null || obj.organizationId === undefined) return null;
  
    const organizationService: Reactory.Service.IReactoryOrganizationService = context.getService('core.OrganizationService@1.0.0') as Reactory.Service.IReactoryOrganizationService;
    return await organizationService.get(obj.organizationId);
  }

  @property(UserMembership, "lastLogin")
  lastLogin(obj: Reactory.Models.TMembership): Date {
    const { lastLogin, user } = obj;

    if (lastLogin) return lastLogin;
    if (user && user.lastLogin) return user.lastLogin;

    return null;
  }

  @property(UserMembership, "created")
  created(obj: Reactory.Models.TMembership): Date {
    const { user } = obj;
    if (user && user.createdAt) return user.createdAt;
    return null;
  }

  @roles(["ADMIN"])
  @mutation("ReactoryCoreRemoveUserMembership")
  removeUserMembership(obj: any, params: { user_id: string, id: string }, context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.CoreSimpleResponse> {
    const { id, user_id } = params;
    const userService: Reactory.Service.IReactoryUserService = context.getService("core.UserService@1.0.0") as Reactory.Service.IReactoryUserService;
    return userService.removeUserMembership(user_id, id);
  }

  @roles(["ADMIN"])
  @mutation("ReactoryCoreCreateUserMembership")
  async createUserMembership(
    obj: any,
    params: {
      user_id: string;
      clientId?: string;
      organization?: string;
      businessUnit?: string;
      roles?: string[];
      membership?: {
        clientId?: string;
        organizationId?: string;
        businessUnitId?: string;
        roles?: string[];
      };
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.TMembership> {
    const userService: Reactory.Service.IReactoryUserService = context.getService(
      "core.UserService@1.0.0"
    ) as Reactory.Service.IReactoryUserService;

    const { user_id } = params;
    const user = (await userService.findUserById(user_id)) as Reactory.Models.IUserDocument;
    if (!user) throw new ApiError(`User not found with id ${user_id}`);

    const client_id = params.clientId || params.membership?.clientId || context.partner._id.toString();
    const org_id = params.organization || params.membership?.organizationId || null;
    const bu_id = params.businessUnit || params.membership?.businessUnitId || null;
    const member_roles = params.roles || params.membership?.roles || ["USER"];

    if (!user.memberships) user.memberships = [] as any;

    let targetMembership = user.getMembership
      ? user.getMembership(client_id, org_id, bu_id)
      : null;

    if (targetMembership) {
      targetMembership.roles = member_roles;
      targetMembership.enabled = true;
    } else {
      const newMem: any = {
        clientId: new ObjectId(client_id),
        organizationId: org_id && ObjectId.isValid(org_id) ? new ObjectId(org_id) : null,
        businessUnitId: bu_id && ObjectId.isValid(bu_id) ? new ObjectId(bu_id) : null,
        roles: member_roles,
        enabled: true,
        created: new Date(),
      };
      user.memberships.push(newMem);
      targetMembership = user.memberships[user.memberships.length - 1];
    }

    await user.save();

    return targetMembership;
  }
}

export default UserMembershipResolver;