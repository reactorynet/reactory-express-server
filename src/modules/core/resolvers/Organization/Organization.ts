
import { Reactory } from '@reactory/server-core/types/reactory';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import { ObjectId } from 'mongoose';

interface CoreOrganizationParams {
  search?: string
}

interface CorePagedOrganizationParams extends CoreOrganizationParams {
  paging: Reactory.IPagingRequest
}

@resolver
class Organization {

  resolver: Reactory.IResolverStruct;

  @query("CoreOrganizations")
  @roles(["USER"])
  async CoreOrganizations(obj: any, params: CoreOrganizationParams, context: Reactory.IReactoryContext ): Promise<Reactory.IOrganization[]> {
    const organizationService = context.getService("core.OrganizationService@1.0.0") as Reactory.Service.IReactoryOrganizationService;
    
    return organizationService.getOrganizationsForLoggedInUser(params.search, "name", "asc");    
  }


  @query("CorePagedOrganizations")
  @roles(["USER"])
  async CorePagedOrganizations(obj: any, params: CorePagedOrganizationParams, context: Reactory.IReactoryContext): Promise<Reactory.IOrganization[]> {
    const organizationService = context.getService("core.OrganizationService@1.0.0") as Reactory.Service.IReactoryOrganizationService;

    return organizationService.getPagedOrganizationsForLoggedInUser(params.search, "name", "asc", params.paging);
  }
  

}

export default Organization;