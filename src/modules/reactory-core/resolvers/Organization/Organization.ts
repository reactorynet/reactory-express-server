
import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import { ObjectId } from 'mongoose';

interface CoreOrganizationParams {
  search?: string
}

interface CorePagedOrganizationParams extends CoreOrganizationParams {
  paging: Reactory.Models.IPagingRequest
}

@resolver
class Organization {

  resolver: Reactory.Graph.IResolverStruct;

  @query("CoreOrganizations")
  @roles(["USER"])
  async CoreOrganizations(obj: any, params: CoreOrganizationParams, context: Reactory.Server.IReactoryContext ): Promise<Reactory.Models.IOrganization[]> {
    const organizationService = context.getService("core.OrganizationService@1.0.0") as Reactory.Service.IReactoryOrganizationService;
    
    return organizationService.getOrganizationsForLoggedInUser(params.search, "name", "asc");    
  }


  @query("CorePagedOrganizations")
  @roles(["USER"])
  async CorePagedOrganizations(obj: any, params: CorePagedOrganizationParams, context: Reactory.Server.ReactoryContext): Promise<Reactory.Models.IOrganization[]> {
    const organizationService = context.getService("core.OrganizationService@1.0.0") as Reactory.Service.IReactoryOrganizationService;

    return organizationService.getPagedOrganizationsForLoggedInUser(params.search, "name", "asc", params.paging);
  }
  

}

export default Organization;