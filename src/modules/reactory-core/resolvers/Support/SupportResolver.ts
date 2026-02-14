
import Reactory from '@reactory/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import { error } from 'console';
import CommentModel from '@reactory/server-modules/reactory-core/models/Comment';
import { CoreFile as ReactoryFileModel } from '@reactory/server-modules/reactory-core/models';

type DeleteArgs = { 
  ids: string[]
  reason?: string
}
// @ts-ignore - this has to be called without the () as this throws an error in the decorator
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
  async comments(obj: Reactory.Models.IReactorySupportTicketDocument, args: any, context: Reactory.Server.IReactoryContext) {
    // Check if comments are already populated (array of objects vs array of IDs)
    if (obj.comments && obj.comments.length > 0) {
      const firstComment = obj.comments[0];
      // If it's already an object with properties, it's populated
      if (typeof firstComment === 'object' && firstComment.text !== undefined) {
        return obj.comments;
      }
    }

    // Comments are not populated, fetch them from the database    
    if (!CommentModel) {
      context.log('Comment model not found', {}, 'warning');
      return [];
    }

    try {
      const commentIds = obj.comments || [];
      if (commentIds.length === 0) {
        return [];
      }

      // Fetch and populate comments
      const populatedComments = await CommentModel
        .find({ 
          _id: { $in: commentIds }, 
          removed: { $ne: true },
          parent: { $exists: false }
        })
        .populate('user')
        .sort({ createdAt: -1 });

      return populatedComments;
    } catch (error) {
      context.log('Error populating comments', { error }, 'error');
      return [];
    }
  }

  @property("ReactorySupportTicket", "documents")
  async documents(obj: Reactory.Models.IReactorySupportTicketDocument, args: any, context: Reactory.Server.IReactoryContext) {
    // Check if documents are already populated
    if (obj.documents && obj.documents.length > 0) {
      const firstDoc = obj.documents[0];
      // If it's already an object with properties, it's populated
      if (typeof firstDoc === 'object' && firstDoc.filename !== undefined) {
        return obj.documents;
      }
    }

    // Documents are not populated, fetch them from the database    
    if (!ReactoryFileModel) {
      context.log('ReactoryFile model not found', {}, 'warning');
      return [];
    }

    try {
      const documentIds = obj.documents || [];
      if (documentIds.length === 0) {
        return [];
      }

      // Fetch documents
      const populatedDocuments = await ReactoryFileModel
        .find({ _id: { $in: documentIds } })
        .exec();

      return populatedDocuments;
    } catch (error) {
      context.log('Error populating documents', { error }, 'error');
      return [];
    }
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
  
  @roles(["USER"], 'args.context')
  @mutation("ReactoryDeleteSupportTicket")
  async deleteTickets(
    _: any, 
    args: { 
      deleteInput: DeleteArgs; 
    }, 
    context: Reactory.Server.IReactoryContext) {
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    try {
      supportService.deleteRequest(args.deleteInput.ids, args.deleteInput.reason);
      return {
        __typename: 'ReactorySupportTicketDeleteSuccess',
        ids: args.deleteInput.ids
      }
    } catch (deleteError) {
      context.log('Error deleting tickets', { deleteError }, 'error', 'core.ReactorySupportService');
      return {
        __typename: 'ReactorySupportTicketDeleteError',
        ids: args.deleteInput.ids,
        error: context.i18n.t('reactory.support-ticket.delete.error', {           
          defaultValue: 'Error deleting tickets' 
        })
      }
    }
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactoryAddSupportTicketComment")
  async addComment(
    obj: any,
    args: {
      input: {
        ticketId: string;
        comment: string;
        parentId?: string;
        attachmentIds?: string[];
      }
    },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryCommentDocument> {
    const { ticketId, comment, parentId, attachmentIds } = args.input;
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return supportService.addComment(ticketId, comment, parentId, attachmentIds);
  }

  @roles(["USER"], 'args.context')
  @mutation("ReactoryAttachFilesToTicket")
  async attachFiles(
    obj: any,
    args: {
      input: {
        ticketId: string;
        fileIds: string[];
      }
    },
    context: Reactory.Server.IReactoryContext
  ) {
    const { ticketId, fileIds } = args.input;
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    
    try {
      const ticket = await supportService.attachDocument(ticketId, fileIds);
      
      // Get the attached files      
      const attachedFiles = await ReactoryFileModel.find({
        _id: { $in: fileIds }
      }).exec();

      return {
        __typename: 'ReactorySupportTicketAttachmentSuccess',
        success: true,
        ticket,
        attachedFiles,
      };
    } catch (attachError) {
      context.log('Error attaching files to ticket', { attachError }, 'error', 'core.ReactorySupportService');
      return {
        __typename: 'ReactorySupportTicketAttachmentError',
        error: 'Failed to attach files',
        message: attachError.message,
      };
    }
  }
        
}

export default SupportResolver;
