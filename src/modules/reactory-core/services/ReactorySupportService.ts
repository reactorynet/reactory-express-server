import Reactory from '@reactorynet/reactory-core';
import { HashUnsigned } from '@reactory/server-core/utils/hash';
import { roles } from '@reactory/server-core/authentication/decorators';
import moment from 'moment';
import { QueryWithHelpers } from 'mongoose';
import ReactorySupportTicketModel from '../models/ReactorySupportTicket';
import ReactoryCommentModel from '../models/Comment';
import ReactoryFileModel from '@reactory/server-modules/reactory-core/models/CoreFile';
import { InsufficientPermissions } from '@reactory/server-core/exceptions';
import { ObjectId } from 'mongodb';
import { service } from '@reactory/server-core/application/decorators';

/**
 * Support tickets are persisted with snake_case enumerations (e.g. `in_progress`)
 * while some UI components were written against kebab-case (`in-progress`).
 * Because the query layer performs an exact `$in` match, a casing mismatch makes
 * filters silently return nothing (observed: the "Open" quick filter matched 0
 * of 3 open tickets).
 *
 * `enumVariants` expands a requested value into every known casing variant so a
 * lookup matches regardless of which convention produced the stored value.
 */
const enumVariants = (values: string | string[]): string[] => {
  const variants = new Set<string>();
  (Array.isArray(values) ? values : [values]).forEach((value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return;
    variants.add(raw);
    variants.add(raw.replace(/-/g, '_'));
    variants.add(raw.replace(/_/g, '-'));
  });
  return Array.from(variants);
};

/** Canonical storage form for enumeration values: lowercase snake_case. */
const canonicalEnum = (value: string): string =>
  String(value ?? '').trim().toLowerCase().replace(/-/g, '_');

@service({
  id: "core.ReactorySupportService@1.0.0",
  nameSpace: "core",
  name: "ReactorySupportService",
  version: "1.0.0",
  dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }
    ],
  serviceType: "support",
  secondaryTypes: ["customerManagement", "user"]
})
class ReactorySupportService implements Reactory.Service.TReactorySupportService {

  private context: Reactory.Server.IReactoryContext
  private fileService: Reactory.Service.IReactoryFileService;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
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
    if (updates.status) ticket.status = canonicalEnum(updates.status);
    if (updates.requestType) ticket.requestType = updates.requestType;
    if (updates.assignTo) ticket.assignedTo = new ObjectId(updates.assignTo) as any;
    if (updates.priority) ticket.priority = updates.priority;
    if (updates.tags) ticket.tags = updates.tags;

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
      parent: parentId ? new ObjectId(parentId) : undefined,
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
    for (const fileId of fileIds) {
      const file = await ReactoryFileModel.findById(fileId).exec();
      if (file && !ticket.documents.some((d: any) => d.toString() === fileId)) {
        ticket.documents.push(new ObjectId(fileId) as any);
       }
     }

    ticket.updatedDate = new Date();
    await ticket.save();
    await ticket.populate('documents');

    return ticket as Reactory.Models.IReactorySupportTicket;
   }

  isAdminUser(context: Reactory.Server.IReactoryContext): boolean {
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

    if (!this.isAdminUser(this.context)) {
      params.createdBy = this.context.user._id;
     }

    if (filter) {
      if (filter.status && filter.status.length > 0) {
        params.status = { $in: enumVariants(filter.status) };
      }

      if (filter.priority && filter.priority.length > 0) {
        params.priority = { $in: enumVariants(filter.priority) };
      }

      if (filter.requestType && filter.requestType.length > 0) {
        params.requestType = { $in: enumVariants(filter.requestType) };
      }

      if (filter.reference && filter.reference.length > 0) {
        params.reference = { $in: filter.reference };
      }

      if (filter.tags && filter.tags.length > 0) {
        params.tags = { $in: filter.tags };
      }

      if (filter.assignedTo && filter.assignedTo.length > 0) {
        params.assignedTo = { $in: filter.assignedTo.map((id: string) => new ObjectId(id)) };
      }

      if (filter.showOverdueOnly === true) {
        // `isOverdue` is a Mongoose VIRTUAL derived from slaDeadline, so it cannot be used
        // as a query predicate - filtering on it matched nothing. Query the underlying
        // stored field instead.
        params.slaDeadline = { $ne: null, $lt: new Date() };
      }

      // The toolbar's "Unassigned" quick filter had no server representation, so it
      // silently returned every ticket. Matches both an explicit null and a missing field.
      if ((filter as any).unassignedOnly === true) {
        params.assignedTo = null;
      }

      // startDate / endDate / dateFields are declared on ReactorySupportTicketFilter but
      // were never applied, so date-scoped filters (e.g. "Resolved Today") could not
      // narrow the result set at all.
      const rawFilter: any = filter as any;
      const dateRange: any = {};
      if (rawFilter.startDate) dateRange.$gte = new Date(rawFilter.startDate);
      if (rawFilter.endDate) dateRange.$lte = new Date(rawFilter.endDate);
      if (Object.keys(dateRange).length > 0) {
        const dateFields: string[] =
          Array.isArray(rawFilter.dateFields) && rawFilter.dateFields.length > 0
            ? rawFilter.dateFields
            : ['updatedDate'];
        params.$and = (params.$and || []).concat(
          dateFields.map((field) => ({ [field]: dateRange })),
        );
      }


      if (filter?.searchString && filter.searchString.trim().length > 0) {
        const regex = { $regex: filter.searchString.trim(), $options: "i" };
        params.$or = [
          { request: regex },
          { description: regex },
          { reference: regex }
        ];
      }
    }

    let query: QueryWithHelpers<Reactory.Models.IReactorySupportTicketDocument[],
      Reactory.Models.IReactorySupportTicketDocument> = ReactorySupportTicketModel.find(params);

    if (pagingRequest) {
      try {
        result.paging.total = await query.count();
        result.tickets = await ReactorySupportTicketModel.find(params)
           .populate('createdBy')
           .populate('assignedTo')
           .skip((pagingRequest.page - 1) * pagingRequest.pageSize)
           .limit(pagingRequest.pageSize)
           .exec();
       } catch (e) {
        this.context.log(`Error: ${e.message}`, { e }, 'error');
       }
     }

    return result;
   }

  async createRequest(request: string, description: string, requestType?: string, meta?: any, formId?: string): Promise<Reactory.Models.IReactorySupportTicket> {
    this.context.log('Creating new Support Request', { request, description }, 'debug', 'core.ReactorySupportService@1.0.0');

    const ticket = new ReactorySupportTicketModel({
      request,
      description,
      requestType,
      meta,
      formId,
      status: "new",
      // HashUnsigned guarantees a non-negative numeric segment. String(user._id)
      // is used so the hash input is stable (hashing a raw ObjectId previously
      // produced 0, yielding the meaningless "REACTORY-0" prefix).
      reference: `${this.context.partner.key}-${HashUnsigned(String(this.context.user._id))}/${moment().format('YYYYMMDD')}/${HashUnsigned(request)}`.toUpperCase(),
      createdBy: this.context.user,
      updatedBy: this.context.user,
      comments: [],
      documents: []
     });

    await ticket.save();

    return ticket;
   }

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async getTicket(id: string): Promise<Reactory.Models.ReactorySupportDocument> {

    const ticket = await ReactorySupportTicketModel.findById(id)
        .exec() as Reactory.Models.ReactorySupportDocument;

    if (!ticket) {
      throw new Error('Ticket not found');
     }

     // Admin/support users can view any ticket
    if (this.isAdminUser(this.context)) {
      return ticket;
     }

     // Non-admin users can only view tickets they created or are assigned to
    const isCreator = (ticket.createdBy as ObjectId).equals(this.context.user._id);
    const isAssignee = (ticket.assignedTo as ObjectId)?.equals(this.context.user._id);

    if (!isCreator && !isAssignee) {
      throw new InsufficientPermissions('User does not have permission to view ticket');
     }

    return ticket;
   }

  onStartup(): Promise<any> {
    return Promise.resolve(true)
   }

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async deleteRequest(ids: string[], reason: string): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
     }

    const filter = {
      _id: { $in: ids.map(id => new ObjectId(id)) },
     };

     // Soft-delete: mark as removed with reason and timestamp
    const result = await ReactorySupportTicketModel.updateMany(filter, {
      $set: {
        status: 'closed',
        updatedDate: new Date(),
        meta: {
           ...((this as any).meta || {}),
          deletedAt: new Date(),
          deletedBy: this.context.user._id,
          deleteReason: reason || 'No reason provided',
         },
       },
     }).exec();

    this.context.log(`Deleted ${result.modifiedCount} support ticket(s)`, {
      ids,
      reason,
      modifiedCount: result.modifiedCount
    }, 'info', 'core.ReactorySupportService@1.0.0');
   }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
   }
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context
    return true;
   }

  setFileService(fileService: Reactory.Service.IReactoryFileService): void {
    this.fileService = fileService;
   }
}


export default ReactorySupportService;
