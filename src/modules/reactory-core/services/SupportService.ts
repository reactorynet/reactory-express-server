import Reactory from '@reactory/reactory-core';
import Hash from '@reactory/server-core/utils/hash';
import { roles } from '@reactory/server-core/authentication/decorators';
import moment from 'moment';
import { QueryWithHelpers } from 'mongoose';
import ReactorySupportTicketModel from '../models/ReactorySupportTicket';

class ReactorySupportService implements Reactory.Service.TReactorySupportService {
  
  name: string;
  nameSpace: string;
  version: string;

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  } 
  

  async updateTicket(ticket_id: string, updates: Reactory.Models.IReactorySupportTicketUpdate): Promise<Reactory.IReactorySupportTicket | Reactory.IReactorySupportTicketDocument> {
    throw new Error('Method not implemented.');
  }
  async attachDocument(ticket_id: string, file: File, name: string): Promise<Reactory.Models.IReactorySupportTicket | Reactory.IReactorySupportTicketDocument> {
    throw new Error('Method not implemented.');
  }

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async pagedRequest(filter: Reactory.Models.IReactorySupportTicketFilter, 
    pagingRequest: Reactory.Models.IPagingRequest): Promise<Reactory.Models.IPagedReactorySupportTickets> {
    
    const result: Reactory.Models.IPagedReactorySupportTickets = {
      paging: {
        page: pagingRequest && pagingRequest.page ? pagingRequest.page : 1,
        pageSize: pagingRequest && pagingRequest.pageSize ? pagingRequest.pageSize : 10,
        total: 0,
        hasNext: false,
      },
      tickets: []
    };

    let params: any = {};

    let isAdmin = this.context.hasRole("ADMIN") === true;
    if(isAdmin === false) isAdmin = this.context.hasRole("SUPPORT_ADMIN") === true;
    if(isAdmin === false) isAdmin = this.context.hasRole("SUPPORT") === true;


    if(isAdmin === false) {
      params.createdBy = this.context.user._id;
    }

    if(filter) {
      if (filter.status) {
        params.status = { $in: filter.status }
      }

      if (filter.reference) {
        params.reference = { $in: filter.reference }
      }

      if(`${filter.searchString}`.length > 0) {
        // params.reference = { $regex: filter.searchString, $options: "i" }
        params.description = { $regex: filter.searchString, $options: "i" }
      }
    }
    
    let query: QueryWithHelpers<Reactory.Models.IReactorySupportTicketDocument[], 
      Reactory.Models.IReactorySupportTicketDocument> = ReactorySupportTicketModel.find(params);
    
    if(pagingRequest) {
      try {     
        result.paging.total = await query.count();                
        result.tickets = await ReactorySupportTicketModel.find(params)
          .populate('createdBy')
          .populate('assignedTo')
          .skip((pagingRequest.page - 1) * pagingRequest.pageSize)
          .limit(pagingRequest.pageSize)
          .exec();
      } catch(e) {
        this.context.log(`Error: ${e.message}`, {e}, 'error');
      }
    }

    return result;    
  }

  async createRequest(request: string, description: string, requestType?: string, meta?: any, formId?: string): Promise<Reactory.Models.IReactorySupportTicket> {
    this.context.log('Creatig new Support Request', { request, description }, 'debug', ReactorySupportService.reactory.id);
    
    let ticket = new ReactorySupportTicketModel({
      request,
      description,
      requestType,
      meta,
      formId,
      status: "new",
      reference: `${this.context.partner.key}-${Hash(this.context.user._id)}/${moment().format('YYYYMMDD')}/${Hash(request)}`.toUpperCase(),
      createdBy: this.context.user,
      updatedBy: this.context.user,
      comments: [],
      documents: []
    });

    await ticket.save().then();

    return ticket;
  }
  
  onStartup(): Promise<any> {
    // throw new Error('Method not implemented.');
    
    return Promise.resolve(true)
  }

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  deleteRequest(ids: string[], reason: string): Promise<void> {
    return Promise.resolve();
  }
  
  getExecutionContext(): Reactory.Server.IReactoryContext {
    // throw new Error('Method not implemented.');
    return this.context;
  }
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context
    return true;
  }
  
  static reactory: Reactory.Service.IReactoryServiceDefinition<ReactorySupportService> = {  
    id: "core.ReactorySupportService@1.0.0",
    nameSpace: "core",
    name: "ReactorySupportService",
    version: "1.0.0",
    description: "Service for logging and managing reactory support tickets",
    service: (
      props: Reactory.Service.IReactoryServiceProps, 
      context: Reactory.Server.IReactoryContext): ReactorySupportService => {
        return new ReactorySupportService(props, context);
    },
    dependencies: [],
    serviceType: 'workflow',
  };

}


export default ReactorySupportService;
