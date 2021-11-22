
import { Reactory } from '@reactory/server-core/types/reactory';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'

@resolver
class SupportResolver {

  resolver: any;

  @roles(["USER"], 'args.context')
  @mutation("ReactoryCreateSupportTicket")
  async createTicket(obj: any, 
    params: { request: string, description: string, requestType?: string, meta?: any, formId?: string },
    context: Reactory.IReactoryContext): Promise<Reactory.IReactorySupportTicket | Reactory.IReactorySupportTicketDocument> {
    const { request, description, requestType = 'general', meta, formId } = params;    
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return supportService.createRequest(request, description, requestType, meta, formId);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactoryUpdateSupportTicket")
  async updateTicket(obj: any,
    params: { ticket_id: string, updates: Reactory.IReactorySupportTicketUpdate },
    context: Reactory.IReactoryContext): Promise<Reactory.IReactorySupportTicket | Reactory.IReactorySupportTicketDocument> {
    const { ticket_id, updates } = params;
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return supportService.updateTicket(ticket_id, updates);
  }
  

  @roles(["USER"], 'args.context')
  @query("ReactoryMySupportTickets")
  async myTickets(obj: any,
    params: { paging: Reactory.IPagingRequest, filter: Reactory.IReactorySupportTicketFilter },
    context: Reactory.IReactoryContext){

    return this.tickets({ ...params.filter, createdBy: context.user._id.toString() }, params.paging, context);
  }
  
  @roles(["USER"], 'args.context')
  @query("ReactorySupportTickets")
  async tickets(filter: Reactory.IReactorySupportTicketFilter, paging: Reactory.IPagingRequest, context: Reactory.IReactoryContext){
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return supportService.pagedRequest(filter, paging);    
  }
        
}

export default SupportResolver;
