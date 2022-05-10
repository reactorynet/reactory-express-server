import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import ApiError from 'exceptions';


const UserMembership: string = "UserMembership"


@resolver
class UserMembershipResolver {

  resolver: any
  
  @property(UserMembership, "id")
  id(obj: Reactory.TMembership): string | null {
    if((obj as Reactory.IMembershipDocument)._id) return (obj as Reactory.IMembershipDocument)._id.toString() 
    if(obj.id) return obj.id;
    return null;
  }

  @property(UserMembership, "client")
  async client(obj: Reactory.TMembership, 
    params: any,
    context: Reactory.Server.IReactoryContext): Promise<Reactory.TReactoryClient> {
    if(obj.clientId === null || obj.clientId === undefined) throw new ApiError('Membership object cannot have null error')
    const systemService: Reactory.Service.IReactorySystemService = context.getService("core.SystemService@1.0.0");
    return systemService.getReactoryClient(obj.clientId);
  }

  @property(UserMembership, "businessUnit")
  async businessUnit(obj: Reactory.TMembership,
    params: any,
    context: Reactory.Server.IReactoryContext): Promise<Reactory.TBusinessUnit> {
    if(obj.organizationId === null || obj.organizationId === undefined) return null;
    if(obj.businessUnitId === null || obj.businessUnitId === undefined) return null;

    const organizationService: Reactory.Service.IReactoryOrganizationService = context.getService('core.OrganizationService@1.0.0') as Reactory.Service.IReactoryOrganizationService;
    return organizationService.findBusinessUnit(obj.organizationId, obj.businessUnitId);
  }

  @property(UserMembership, "lastLogin")
  lastLogin(obj: Reactory.TMembership): Date {
    const { lastLogin, user } = obj;

    if (lastLogin) return lastLogin;
    if (user && user.lastLogin) return user.lastLogin;

    return null;
  }

  @property(UserMembership, "created")
  created(obj: Reactory.TMembership): Date {
    const { user } = obj;
    if (user && user.createdAt) return user.createdAt;
    return null;
  }
  
}

export default UserMembershipResolver;