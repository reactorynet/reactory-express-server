import Reactory from '@reactory/reactory-core';
import Hash from '@reactory/server-core/utils/hash';
import { roles } from '@reactory/server-core/authentication/decorators';
import moment from 'moment';
import { QueryWithHelpers } from 'mongoose';
import ReactorySupportTicketModel from '../models/ReactorySupportTicket';
import ReactoryCommentModel from '../models/Comment';
import { InsufficientPermissions } from '@reactory/server-core/exceptions';
import { ObjectId } from 'mongodb';

class ReactorySupportService implements Reactory.Service.TReactorySupportService {
  
  name: string;
  nameSpace: string;
  version: string;

  props: Reactory.Service.IReactoryServiceProps;
  context: Reactory.Server.IReactoryContext

  fileService: Reactory.Service.IReactoryFileService;  
  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  } 
  

  async updateTicket(ticket_id: string, updates: Reactory.Models.IReactorySupportTicketUpdate): Promise<Reactory.Models.IReactorySupportTicket | Reactory.Models.IReactorySupportTicketDocument> {
    
    const ticket: Reactory.Models.ReactorySupportDocument = await ReactorySupportTicketModel.findById(ticket_id).exec() as Reactory.Models.ReactorySupportDocument;
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Check permissions
    const canUpdate = this.isAdminUser(this.context) || 
                     ticket.createdBy.toString() === this.context.user._id.toString() ||
                     (ticket.assignedTo && ticket.assignedTo.toString() === this.context.user._id.toString());

    if (!canUpdate) {
      throw new InsufficientPermissions('User does not have permission to update this ticket');
    }

    // Apply updates
    if (updates.request) ticket.request = updates.request;
    if (updates.description) ticket.description = updates.description;
    if (updates.status) ticket.status = updates.status;
    if (updates.requestType) ticket.requestType = updates.requestType;
    if (updates.assignTo) ticket.assignedTo = new ObjectId(updates.assignTo) as any;
    
    ticket.updatedDate = new Date();
    ticket.updatedBy = this.context.user as any;

    // Add comment if provided
    if (updates.comment) {
      const comment = await this.addComment(ticket._id.toString(), updates.comment);
      ticket.comments?.push(comment._id);
    }

    await ticket.save();
    await ticket.populate('createdBy assignedTo comments');

    return ticket;
  }

  async addComment(ticketId: string, commentText: string, parentId?: string, attachmentIds?: string[]): Promise<Reactory.Models.ICommentDocument> {
    const ticket = await ReactorySupportTicketModel.findById(ticketId).exec();
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Check permissions
    const canComment = this.isAdminUser(this.context) || 
                      ticket.createdBy.toString() === this.context.user._id.toString() ||
                      (ticket.assignedTo && ticket.assignedTo.toString() === this.context.user._id.toString());

    if (!canComment) {
      throw new InsufficientPermissions('User does not have permission to comment on this ticket');
    }

    // Create comment
    const CommentModel = ReactoryCommentModel;
    const comment = new CommentModel({
      text: commentText,
      user: this.context.user._id,
      context: 'ReactorySupportTicket',
      contextId: ticket._id,
      createdAt: new Date(),
      parentId: parentId ? new ObjectId(parentId) : undefined,      
    });

    await comment.save();

    // Add to ticket
    ticket.comments.push(comment._id);
    ticket.updatedDate = new Date();
    await ticket.save();

    await comment.populate('user');

    return comment;
  }

  async attachDocument(ticket_id: string, fileIds: string[]): Promise<Reactory.Models.IReactorySupportTicket | Reactory.Models.IReactorySupportTicketDocument> {
    const ticket = await ReactorySupportTicketModel.findById(ticket_id).exec();
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Check permissions
    const canAttach = this.isAdminUser(this.context) || 
                     ticket.createdBy.toString() === this.context.user._id.toString() ||
                     (ticket.assignedTo && ticket.assignedTo.toString() === this.context.user._id.toString());

    if (!canAttach) {
      throw new InsufficientPermissions('User does not have permission to attach files to this ticket');
    }

    // Add files to ticket
    const ReactoryFileModel = this.context.models.ReactoryFile;
    for (const fileId of fileIds) {
      const file = await ReactoryFileModel.findById(fileId).exec();
      if (file && !ticket.documents.some((d: any) => d.toString() === fileId)) {
        ticket.documents.push(new ObjectId(fileId) as any);
      }
    }

    ticket.updatedDate = new Date();
    await ticket.save();
    await ticket.populate('documents');

    return ticket;
  }

  isAdminUser = (context: Reactory.Server.IReactoryContext): boolean => { 
    return context.hasRole("ADMIN") === true || 
      context.hasRole("SUPPORT_ADMIN") === true || 
      context.hasRole("SUPPORT") === true;
  }

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async pagedRequest(filter: Partial<Reactory.Models.IReactorySupportTicketFilter>, 
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

      if(filter?.searchString?.length > 0) {
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

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async getTicket(id: string): Promise<Reactory.Models.ReactorySupportDocument> { 
    
    const ticket: Reactory.Models.ReactorySupportDocument = await ReactorySupportTicketModel.findById(id)
      .exec()
      .then() as Reactory.Models.ReactorySupportDocument;

    let canView = this.isAdminUser(this.context) === true;
    if (canView === false) {
      // check if the user is assigned to the ticket
      if ((ticket.assignedTo as ObjectId).equals(this.context.user._id)) {
        canView = true;
      }

      if ((ticket.createdBy as ObjectId).equals(this.context.user._id) && canView === false) {
        canView = true;
      }
    }
    
    if (this.isAdminUser(this.context) === false) {
      // check if the user is assigned to the ticket
      if ((ticket.assignedTo as Reactory.Models.IUserDocument)._id.toString() !== this.context.user._id.toString()) {
        throw new InsufficientPermissions('User does not have Insufficient permissions to view ticket');
      }


      if ((ticket.createdBy as Reactory.Models.IUserDocument)._id.toString() !== this.context.user._id.toString()) {
        throw new InsufficientPermissions('User does not have Insufficient permissions to view ticket');
      }
    }

    return ticket;
  }
  
  onStartup(): Promise<any> {
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

  setFileService(fileService: Reactory.Service.IReactoryFileService): void {
    this.fileService = fileService;    
  }

  setCommentService(commentService: Reactory.Service.ICommentService): void {
    this.commentService = commentService;    
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
    dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' },
      { id: 'core.CommentService@1.0.0', alias: 'commentService' },
    ],
    serviceType: 'workflow',
  };

}


export default ReactorySupportService;
