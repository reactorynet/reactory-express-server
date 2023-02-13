
import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
@resolver
class SupportResolver {

  resolver: any;

  @roles(["USER"], 'args.context')
  @mutation("ReactoryCreateSupportTicket")
  async createTicket(obj: any, 
    params: { request: string, description: string, requestType?: string, meta?: any, formId?: string },
    context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.IReactorySupportTicket | Reactory.Models.IReactorySupportTicketDocument> {
    const { request, description, requestType = 'general', meta, formId } = params;    
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return supportService.createRequest(request, description, requestType, meta, formId);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactoryUpdateSupportTicket")
  async updateTicket(obj: any,
    params: { ticket_id: string, updates: Reactory.Models.IReactorySupportTicketUpdate },
    context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.IReactorySupportTicket | Reactory.Models.IReactorySupportTicketDocument> {
    const { ticket_id, updates } = params;
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return supportService.updateTicket(ticket_id, updates);
  }
  

  @roles(["USER"], 'args.context')
  @query("ReactoryMySupportTickets")
  async myTickets(obj: any,
      params: { 
        paging: Reactory.Models.IPagingRequest, 
        filter: Reactory.Models.IReactorySupportTicketFilter 
      },
      context: Reactory.Server.IReactoryContext){

    return this.tickets({ ...params.filter, createdBy: context.user._id.toString() }, params.paging, context);
  }
  
  @property("ReactorySupportTicket", "id")
  ticketId(obj: Reactory.Models.IReactorySupportTicketDocument) {
    return obj._id;
  }

  @property("ReactorySupportTicket", "createdBy")
  async createdBy(obj: Reactory.Models.IReactorySupportTicketDocument) {    
    return obj.createdBy;
  }

  @property("ReactorySupportTicket", "assignedTo")
  async assignedTo(obj: Reactory.Models.IReactorySupportTicketDocument) {
    if (obj.populated("assignedTo") === undefined) {
      obj.populate("assignedTo");
      //await obj.execPopulate();
    }

    return obj.assignedTo;
  }

  @property("ReactorySupportTicket", "comments")
  async comments(obj: Reactory.Models.IReactorySupportTicketDocument) {
    if (obj.populated("comments") === undefined) {
      obj.populate("comments");
      //await obj.execPopulate();
    }

    return obj.comments;
  }
  
  @roles(["ADMIN", "SUPPORT_ADMIN", "SUPPORT"], 'args.context')
  @query("ReactorySupportTickets")
  async tickets(
    obj: any,
    args: {
      filter: Reactory.Models.IReactorySupportTicketFilter, 
      paging: Reactory.Models.IPagingRequest, 
    },
    context: Reactory.Server.IReactoryContext){
      const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
      return supportService.pagedRequest(args.filter, args.paging);
  }

  @roles(["USER"], 'args.context')
  @query("ReactoryMySupportTickets")
  async userTickets(
    obj: any,
    args: {
      filter: Reactory.Models.IReactorySupportTicketFilter,
      paging: Reactory.Models.IPagingRequest,
    },
    context: Reactory.Server.IReactoryContext) {
      const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
      return supportService.pagedRequest(args.filter, args.paging);
  }
        
}

export default SupportResolver;
