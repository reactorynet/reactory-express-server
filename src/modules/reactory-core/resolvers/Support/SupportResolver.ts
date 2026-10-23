import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'
import CommentModel from '@reactory/server-modules/reactory-core/models/Comment';
import { CoreFile as ReactoryFileModel } from '@reactory/server-modules/reactory-core/models';

type DeleteArgs = {
  ids: string[]
  reason?: string
}

/**
 * A comment is a reply when it carries a parent reference (id or document).
 *
 * `parent` is left undefined by every write path (`addComment` only sets it
 * when a `parentId` is supplied), and an explicit `null` means the same thing:
 * root. The query branch approximates this with `parent: { $exists: false }`,
 * which would also drop a stored `parent: null`; nothing in the write paths can
 * produce that shape, and treating `null` as "no parent" is the intent.
 */
const isReplyComment = (comment: any): boolean => {
  const parent = comment?.parent;
  if (parent === null || parent === undefined) return false;
  const parentId = String(parent._id ?? parent.id ?? parent);
  return parentId.length > 0;
};

/**
 * Ticket-level comment projection.
 *
 * The `ReactorySupportTicket.comments` field is deliberately a *root-only,
 * moderated-safe, newest-first* view: a ticket page shows the top-level
 * conversation and loads replies per comment through `getCommentReplies`.
 * `removed` comments are hidden unless a caller explicitly opts in elsewhere
 * (`getCommentsByContext(includeRemoved: true)`).
 *
 * This projection exists because the property has two input shapes:
 *  - unpopulated (an array of ObjectIds) -> the query below applies the rules;
 *  - populated (comment documents) -> the rules must be applied in memory.
 * Before TOOLS-001 the single-ticket read never populated comments, so only the
 * query branch was ever taken. Now that `getTicket`/`getTicketByReference`
 * populate them, both branches have to produce the same result or the field's
 * contract changes silently.
 */
const projectTicketLevelComments = (comments: any[]): any[] =>
  (Array.isArray(comments) ? comments : [])
    .filter((comment) => !!comment && comment.removed !== true && !isReplyComment(comment))
    // Newest first, matching the query branch's `sort({ createdAt: -1 })`.
    // Array#sort is stable, so comments sharing a timestamp keep their order.
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

// @ts-ignore - decorator requires this form without () invocation
@resolver
class SupportResolver {

  resolver: any;

    @roles(["USER"], 'args.context')
    @mutation("ReactoryCreateSupportTicket")
  async createTicket(obj: any,
    params: { request: string, description: string, requestType?: string, priority?: string, meta?: any, formId?: string },
    context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.IReactorySupportTicket | Reactory.Models.IReactorySupportTicketDocument> {
    const { request, description, requestType = 'general', priority, meta, formId } = params;
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    // `priority` is cast: the published TReactorySupportService interface still
    // declares the 5-arg signature, but the implementation now accepts priority
    // (trailing optional arg) and applies it to the ticket field.
    return (supportService as any).createRequest(request, description, requestType, meta, formId, priority);
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
      context: Reactory.Server.IReactoryContext) {

    // Straight to the service: `tickets` is gated to support staff, and a user
    // listing their own tickets is not.
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return supportService.pagedRequest({ ...params.filter, createdBy: context.user._id.toString() }, params.paging);
   }

  /**
   * A single ticket addressed by its human readable reference — the identifier
   * the details page link carries. The service applies the read rules: support
   * staff see any ticket in the tenant, everyone else only their own/assigned
   * tickets. Returns null when the reference matches nothing.
   */
  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"], 'args.context')
  @query("ReactorySupportTicketByReference")
  async ticketByReference(
      obj: any,
      params: { reference: string },
      context: Reactory.Server.IReactoryContext) {
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return (supportService as any).getTicketByReference(params?.reference);
   }

   @property("ReactorySupportTicket", "id")
  ticketId(obj: Reactory.Models.IReactorySupportTicketDocument) {
    return obj._id;
   }

   @property("ReactorySupportTicket", "createdBy")
  async createdBy(obj: Reactory.Models.IReactorySupportTicketDocument) {
    if (!obj.populated('createdBy')) {
      await obj.populate('createdBy');
     }
    return obj.createdBy;
    }

   @property("ReactorySupportTicket", "assignedTo")
  async assignedTo(obj: Reactory.Models.IReactorySupportTicketDocument) {
    if (!obj.populated('assignedTo')) {
      await obj.populate('assignedTo');
     }
    return obj.assignedTo;
    }

   @property("ReactorySupportTicket", "comments")
  async comments(obj: Reactory.Models.IReactorySupportTicketDocument, args: any, context: Reactory.Server.IReactoryContext) {
      // Check if comments are already populated (array of objects vs array of IDs)
    if (obj.comments && obj.comments.length > 0) {
      const firstComment = obj.comments[0];
        // If it's already an object with properties, it's populated. Apply the
        // same projection the query branch would have produced: roots only,
        // `removed` hidden, newest first.
      if (typeof firstComment === 'object' && firstComment.text !== undefined) {
        return projectTicketLevelComments(obj.comments as any[]);
        }
      // A non-empty array of ids falls through to the query below, which owns
      // the same projection for the unpopulated shape.
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

        // Fetch and populate comments in a single query
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

         // Fetch documents in a single query
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
    context: Reactory.Server.IReactoryContext) {
      const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
      return supportService.pagedRequest(args.filter, args.paging);
     }

    @roles(["USER"], 'args.context')
    @mutation("ReactorySupportTicketComment")
  async addComment(
    obj: any,
    args: {
       id: string;
        comment: string;
       },
    context: Reactory.Server.IReactoryContext
   ): Promise<Reactory.Models.IReactoryCommentDocument> {
    const { id, comment } = args;
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    return supportService.addComment(id, comment);
   }

    @roles(["USER"], 'args.context')
    @mutation("ReactoryAddSupportTicketComment")
  async addCommentV2(
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

    @roles(["USER"], 'args.context')
    @mutation("ReactorySupportTicketDelete")
  async deleteTickets(
      _: any,
    args: { ids: string[] },
    context: Reactory.Server.IReactoryContext) {
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    try {
      await supportService.deleteRequest(args.ids, 'Deleted via UI');
      return {
          __typename: 'ReactorySupportTicketDeleteSuccess',
         ids: args.ids
         }
      } catch (deleteError) {
      context.log('Error deleting tickets', { deleteError }, 'error', 'core.ReactorySupportService@1.0.0');
      return {
           __typename: 'ReactorySupportTicketDeleteError',
            ids: args.ids,
             error: context.i18n.t('reactory.support-ticket.delete.error', {
              defaultValue: 'Error deleting tickets'
             })
          }
        }
     }

    @roles(["USER"], 'args.context')
    @mutation("ReactoryDeleteSupportTicket")
  async deleteTicketsV2(
      _: any,
    args: {
         deleteInput: DeleteArgs;
       },
    context: Reactory.Server.IReactoryContext) {
    const supportService: Reactory.Service.TReactorySupportService = context.getService("core.ReactorySupportService@1.0.0") as Reactory.Service.TReactorySupportService;
    try {
      await supportService.deleteRequest(args.deleteInput.ids, args.deleteInput.reason);
      return {
           __typename: 'ReactorySupportTicketDeleteSuccess',
            ids: args.deleteInput.ids
         }
        } catch (deleteError) {
      context.log('Error deleting tickets', { deleteError }, 'error', 'core.ReactorySupportService@1.0.0');
      return {
           __typename: 'ReactorySupportTicketDeleteError',
            ids: args.deleteInput.ids,
             error: context.i18n.t('reactory.support-ticket.delete.error', {
              defaultValue: 'Error deleting tickets'
              })
          }
         }
     }
}

export default SupportResolver;
