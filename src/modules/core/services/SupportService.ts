import { Reactory } from '@reactory/server-core/types/reactory';
import Hash from '@reactory/server-core/utils/hash';
import moment from 'moment';
import ReactorySupportTicketModel from '../models/ReactorySupportTicket';

class ReactorySupportService implements Reactory.Service.TReactorySupportService {
  
  name: string;
  nameSpace: string;
  version: string;

  props: Reactory.IReactoryServiceProps;
  context: Reactory.IReactoryContext  

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    this.props = props;
    this.context = context;
  } 

  async updateTicket(ticket_id: string, updates: Reactory.IReactorySupportTicketUpdate): Promise<Reactory.IReactorySupportTicket | Reactory.IReactorySupportTicketDocument> {
    throw new Error('Method not implemented.');
  }
  async attachDocument(ticket_id: string, file: File, name: string): Promise<Reactory.IReactorySupportTicket | Reactory.IReactorySupportTicketDocument> {
    throw new Error('Method not implemented.');
  }
  async pagedRequest(filter: Reactory.IReactorySupportTicketFilter, paging: Reactory.IPagingRequest): Promise<Reactory.IPagedReactorySupportTickets> {
    throw new Error('Method not implemented.');
  }

  async createRequest(request: string, description: string, requestType?: string, meta?: any, formId?: string): Promise<Reactory.IReactorySupportTicket> {
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
  
  getExecutionContext(): Reactory.IReactoryContext {
    // throw new Error('Method not implemented.');
    return this.context;
  }
  setExecutionContext(context: Reactory.IReactoryContext): boolean {
    this.context = context
    return true;
  }
  
  static reactory: Reactory.IReactoryServiceDefinition = {  
    id: "core.ReactorySupportService@1.0.0",
    name: "Support Service",
    description: "Service for logging and managing reactory support tickets",
    service: (props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) => {
      return new ReactorySupportService(props, context);
    },
    dependencies: [],
    serviceType: 'workflow',
  };

}


export default ReactorySupportService;
